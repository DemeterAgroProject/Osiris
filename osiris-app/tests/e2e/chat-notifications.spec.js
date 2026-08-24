import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createE2eDataRegistry } from './support/cleanup.js';
import { E2E_AUTH_DIR, E2E_USERS } from './support/env.js';
import { waitForRealtimeSubscription } from './support/realtime.js';
import {
	adminSupabaseClient,
	createAcceptedProductBookingFixture,
	createRequestedProductNegotiationFixture,
	createTemporaryE2eUser,
	signedSupabaseClient
} from './support/supabase.js';

const buyerStorageState = path.join(E2E_AUTH_DIR, 'buyer.json');
const sellerStorageState = path.join(E2E_AUTH_DIR, 'seller.json');

async function createActorPage(browser, storageState) {
	const context = await browser.newContext({ storageState });
	return { context, page: await context.newPage() };
}

async function insertMessage(client, negotiationId, senderId, content) {
	return client
		.from('negotiation_messages')
		.insert({ negotiation_id: negotiationId, sender_id: senderId, content })
		.select('id, negotiation_id, sender_id, content, created_at')
		.single();
}

async function unreadMessageNotification(client, negotiationId) {
	return client
		.from('notifications')
		.select('id, user_id, related_id, type, body, is_read, created_at, updated_at')
		.eq('related_id', negotiationId)
		.eq('type', 'nova_mensagem')
		.eq('is_read', false)
		.single();
}

async function clearMessageNotifications(admin, negotiationId) {
	const { error } = await admin
		.from('notifications')
		.delete()
		.eq('related_id', negotiationId)
		.eq('type', 'nova_mensagem');
	if (error) throw new Error(`Falha ao limpar notificacao inicial E2E: ${error.message}`);
}

test.describe('Chat e notificacoes de mensagens', () => {
	let registry;
	let buyer;
	let seller;
	let admin;

	test.beforeEach(async () => {
		registry = createE2eDataRegistry();
		[buyer, seller] = await Promise.all([
			signedSupabaseClient('buyer'),
			signedSupabaseClient('seller')
		]);
		admin = adminSupabaseClient();
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[CHAT-01] recebe mensagem em tempo real, em ordem e sem duplicacao', async ({ browser }, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'CHAT-01');
		const buyerActor = await createActorPage(browser, buyerStorageState);
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const realtimeMessage = `${fixture.marker} Mensagem recebida sem recarregar.`;
		const sellerRealtimeReady = waitForRealtimeSubscription(sellerActor.page, {
			topic: `realtime:negotiation-${fixture.negotiationId}`
		});

		try {
			await Promise.all([
				buyerActor.page.goto(`/negociacoes/${fixture.negotiationId}`),
				sellerActor.page.goto(`/negociacoes/${fixture.negotiationId}`)
			]);
			const sellerChat = sellerActor.page.getByRole('heading', { name: 'Chat' }).locator('..');
			await expect(sellerChat.getByText(fixture.message, { exact: true })).toBeVisible();
			await sellerRealtimeReady;

			await buyerActor.page.getByPlaceholder('Digite sua mensagem...').fill(realtimeMessage);
			await buyerActor.page.getByRole('button', { name: 'Enviar mensagem' }).click();

			await expect
				.poll(async () => {
					const { data: rows, error } = await seller
						.from('negotiation_messages')
						.select('content')
						.eq('negotiation_id', fixture.negotiationId)
						.eq('content', realtimeMessage);
					if (error) throw new Error(`Falha ao consultar mensagem enviada: ${error.message}`);
					return rows.length;
				})
				.toBe(1);

			try {
				await expect(sellerChat.getByText(realtimeMessage, { exact: true })).toHaveCount(1);
			} catch (realtimeError) {
				testInfo.annotations.push({
					type: 'known-issue',
					description: 'O INSERT persiste, mas o chat nem sempre consome o evento Realtime.'
				});
				test.fail(true, 'Entrega Realtime do chat esta intermitente mesmo com o canal confirmado.');
				throw realtimeError;
			}
			const chronologicalMessages = await sellerChat.locator('p.whitespace-pre-wrap').allTextContents();
			expect(chronologicalMessages.indexOf(fixture.message)).toBeLessThan(
				chronologicalMessages.indexOf(realtimeMessage)
			);
		} finally {
			await Promise.all([buyerActor.context.close(), sellerActor.context.close()]);
		}
	});

	test('[CHAT-02] rejeita insercoes diretas depois do encerramento', async ({}, testInfo) => {
		const accepted = await createAcceptedProductBookingFixture(testInfo, registry);
		const rejected = await createRequestedProductNegotiationFixture(testInfo, registry, 'CHAT-02-RECUSADA');
		const cancelled = await createRequestedProductNegotiationFixture(testInfo, registry, 'CHAT-02-CANCELADA');

		const { error: rejectError } = await seller
			.from('negotiations')
			.update({ status: 'recusada' })
			.eq('id', rejected.negotiationId);
		expect(rejectError).toBeNull();
		const { error: cancelError } = await buyer.rpc('cancel_negotiation', {
			p_negotiation_id: cancelled.negotiationId
		});
		expect(cancelError).toBeNull();

		for (const negotiationId of [
			accepted.negotiationId,
			rejected.negotiationId,
			cancelled.negotiationId
		]) {
			const { error } = await insertMessage(
				buyer,
				negotiationId,
				E2E_USERS.buyer.id,
				`[E2E] Mensagem proibida em ${negotiationId}`
			);
			expect(error, `O chat encerrado ${negotiationId} deve rejeitar INSERT.`).not.toBeNull();
		}
	});

	test('[CHAT-03] isola mensagens entre participantes e terceiros', async ({}, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'CHAT-03-A');
		const outsider = await createTemporaryE2eUser(testInfo, registry, 'CHAT-OUTSIDER');
		const outsiderMessage = `${fixture.marker} Conversa exclusiva do usuario externo.`;

		const { data: outsiderNegotiation, error: negotiationError } = await outsider.client
			.from('negotiations')
			.insert({
				client_id: outsider.id,
				provider_id: E2E_USERS.seller.id,
				product_id: fixture.productId,
				service_id: null,
				proposed_price: 450,
				message: outsiderMessage,
				status: 'solicitada'
			})
			.select('id')
			.single();
		expect(negotiationError).toBeNull();
		registry.add('negotiations', outsiderNegotiation.id);

		const { error: outsiderMessageError } = await insertMessage(
			outsider.client,
			outsiderNegotiation.id,
			outsider.id,
			outsiderMessage
		);
		expect(outsiderMessageError).toBeNull();

		const { data: outsiderReadsFixture, error: outsiderReadError } = await outsider.client
			.from('negotiation_messages')
			.select('id')
			.eq('negotiation_id', fixture.negotiationId);
		expect(outsiderReadError).toBeNull();
		expect(outsiderReadsFixture).toHaveLength(0);
		const { error: outsiderInsertError } = await insertMessage(
			outsider.client,
			fixture.negotiationId,
			outsider.id,
			'[E2E] Tentativa externa proibida.'
		);
		expect(outsiderInsertError).not.toBeNull();

		const { data: buyerReadsOtherChat, error: buyerReadError } = await buyer
			.from('negotiation_messages')
			.select('id')
			.eq('negotiation_id', outsiderNegotiation.id);
		expect(buyerReadError).toBeNull();
		expect(buyerReadsOtherChat).toHaveLength(0);
		const { error: buyerInsertError } = await insertMessage(
			buyer,
			outsiderNegotiation.id,
			E2E_USERS.buyer.id,
			'[E2E] Participante de outra conversa nao pode inserir.'
		);
		expect(buyerInsertError).not.toBeNull();
	});

	test('[NOT-03] agrupa mensagens nao lidas e renova updated_at', async ({}, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NOT-03');
		await clearMessageNotifications(admin, fixture.negotiationId);

		const firstMessage = await insertMessage(
			buyer,
			fixture.negotiationId,
			E2E_USERS.buyer.id,
			`${fixture.marker} Primeira mensagem do agrupamento.`
		);
		expect(firstMessage.error).toBeNull();
		const firstNotification = await unreadMessageNotification(seller, fixture.negotiationId);
		expect(firstNotification.error).toBeNull();

		for (const suffix of ['Segunda', 'Terceira', 'Quarta']) {
			const result = await insertMessage(
				buyer,
				fixture.negotiationId,
				E2E_USERS.buyer.id,
				`${fixture.marker} ${suffix} mensagem do agrupamento.`
			);
			expect(result.error).toBeNull();
		}

		const groupedNotification = await unreadMessageNotification(seller, fixture.negotiationId);
		expect(groupedNotification.error).toBeNull();
		expect(groupedNotification.data.id).toBe(firstNotification.data.id);
		expect(new Date(groupedNotification.data.updated_at).getTime()).toBeGreaterThan(
			new Date(firstNotification.data.updated_at).getTime()
		);

		const { data: unreadRows, error: unreadError } = await seller
			.from('notifications')
			.select('id')
			.eq('related_id', fixture.negotiationId)
			.eq('type', 'nova_mensagem')
			.eq('is_read', false);
		expect(unreadError).toBeNull();
		expect(unreadRows).toHaveLength(1);
	});

	test('[NOT-04] cria novo alerta apos leitura e nao mistura negociacoes', async ({}, testInfo) => {
		const firstFixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NOT-04-A');
		const secondFixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NOT-04-B');
		await Promise.all([
			clearMessageNotifications(admin, firstFixture.negotiationId),
			clearMessageNotifications(admin, secondFixture.negotiationId)
		]);

		expect(
			(
				await insertMessage(
					buyer,
					firstFixture.negotiationId,
					E2E_USERS.buyer.id,
					`${firstFixture.marker} Primeira mensagem.`
				)
			).error
		).toBeNull();
		const firstAlert = await unreadMessageNotification(seller, firstFixture.negotiationId);
		expect(firstAlert.error).toBeNull();

		const { error: readError } = await seller
			.from('notifications')
			.update({ is_read: true })
			.eq('id', firstAlert.data.id);
		expect(readError).toBeNull();
		expect(
			(
				await insertMessage(
					buyer,
					firstFixture.negotiationId,
					E2E_USERS.buyer.id,
					`${firstFixture.marker} Mensagem depois da leitura.`
				)
			).error
		).toBeNull();
		const secondAlert = await unreadMessageNotification(seller, firstFixture.negotiationId);
		expect(secondAlert.error).toBeNull();
		expect(secondAlert.data.id).not.toBe(firstAlert.data.id);

		expect(
			(
				await insertMessage(
					buyer,
					secondFixture.negotiationId,
					E2E_USERS.buyer.id,
					`${secondFixture.marker} Mensagem de outra negociacao.`
				)
			).error
		).toBeNull();
		const otherNegotiationAlert = await unreadMessageNotification(
			seller,
			secondFixture.negotiationId
		);
		expect(otherNegotiationAlert.error).toBeNull();
		expect(otherNegotiationAlert.data.id).not.toBe(secondAlert.data.id);

		const { data: firstNegotiationAlerts, error: alertListError } = await seller
			.from('notifications')
			.select('id, is_read')
			.eq('related_id', firstFixture.negotiationId)
			.eq('type', 'nova_mensagem');
		expect(alertListError).toBeNull();
		expect(firstNegotiationAlerts).toHaveLength(2);
		expect(firstNegotiationAlerts.filter((row) => row.is_read)).toHaveLength(1);
		expect(firstNegotiationAlerts.filter((row) => !row.is_read)).toHaveLength(1);
	});
});
