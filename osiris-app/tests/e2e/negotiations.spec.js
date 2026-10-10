import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createE2eDataRegistry } from './support/cleanup.js';
import { E2E_AUTH_DIR, E2E_USERS } from './support/env.js';
import { waitForRealtimeSubscription } from './support/realtime.js';
import {
	createNegotiableProductFixture,
	createRequestedProductNegotiationFixture,
	signedSupabaseClient
} from './support/supabase.js';

const buyerStorageState = path.join(E2E_AUTH_DIR, 'buyer.json');
const sellerStorageState = path.join(E2E_AUTH_DIR, 'seller.json');

async function createActorPage(browser, storageState) {
	const context = await browser.newContext({ storageState });
	return { context, page: await context.newPage() };
}

async function findNegotiationByProduct(client, productId) {
	const { data, error } = await client
		.from('negotiations')
		.select('*')
		.eq('product_id', productId)
		.eq('client_id', E2E_USERS.buyer.id)
		.eq('provider_id', E2E_USERS.seller.id)
		.single();

	if (error) throw new Error(`Negociacao E2E nao encontrada: ${error.message}`);
	return data;
}

async function findBookingByNegotiation(client, negotiationId) {
	const { data, error } = await client
		.from('bookings')
		.select('id, negotiation_id, client_id, provider_id, product_id, status, total_price')
		.eq('negotiation_id', negotiationId);

	if (error) throw new Error(`Falha ao consultar operacao E2E: ${error.message}`);
	return data;
}

async function notificationsFor(client, negotiationId, type) {
	const { data, error } = await client
		.from('notifications')
		.select('id, user_id, type, title, body, link, related_id, is_read')
		.eq('related_id', negotiationId)
		.eq('type', type);

	if (error) throw new Error(`Falha ao consultar notificacoes E2E: ${error.message}`);
	return data;
}

async function submitProductProposal(page, productId, { value, quantity, message }) {
	await page.goto(`/anuncio/produto/${productId}`);
	await page.getByRole('button', { name: 'Negociar' }).click();
	await expect(page.getByRole('heading', { name: 'Fazer proposta' })).toBeVisible();
	await page.locator('#proposalValue').fill(String(value));
	await page.locator('#quantity').fill(String(quantity));
	await page.locator('#message').fill(message);
	await page.getByRole('button', { name: 'Enviar proposta' }).click();
}

test.describe('Negociacoes', () => {
	let registry;
	let buyer;
	let seller;

	test.beforeEach(async () => {
		registry = createE2eDataRegistry();
		[buyer, seller] = await Promise.all([
			signedSupabaseClient('buyer'),
			signedSupabaseClient('seller')
		]);
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[NEG-01][NOT-01] cria proposta e notifica o vendedor em tempo real', async ({ browser }, testInfo) => {
		const fixture = await createNegotiableProductFixture(testInfo, registry, 'NEG-01');
		const proposalMessage = `${fixture.marker} Preciso de quarenta sacas para a proxima safra.`;
		const { error: markPreviousNotificationsError } = await seller
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', E2E_USERS.seller.id)
			.eq('is_read', false);
		expect(markPreviousNotificationsError).toBeNull();
		const buyerActor = await createActorPage(browser, buyerStorageState);
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const sellerRealtimeReady = waitForRealtimeSubscription(sellerActor.page, {
			topicPrefix: `realtime:notifications:${E2E_USERS.seller.id}:`
		});

		try {
			await sellerActor.page.goto('/');
			await expect(sellerActor.page.getByRole('button', { name: 'Notificações' })).toBeVisible();
			await sellerRealtimeReady;

			await submitProductProposal(buyerActor.page, fixture.productId, {
				value: 1100,
				quantity: 40,
				message: proposalMessage
			});
			await expect(buyerActor.page).toHaveURL(/\/negociacoes\/[^/]+$/);

			const negotiation = await findNegotiationByProduct(buyer, fixture.productId);
			registry.add('negotiations', negotiation.id);
			const fullMessage = `${proposalMessage}\n\nQuantidade solicitada: 40`;

			expect(negotiation).toMatchObject({
				client_id: E2E_USERS.buyer.id,
				provider_id: E2E_USERS.seller.id,
				product_id: fixture.productId,
				service_id: null,
				proposed_price: 1100,
				message: fullMessage,
				status: 'solicitada'
			});

			const { data: messages, error: messagesError } = await buyer
				.from('negotiation_messages')
				.select('sender_id, content')
				.eq('negotiation_id', negotiation.id);
			expect(messagesError).toBeNull();
			expect(messages).toEqual([{ sender_id: E2E_USERS.buyer.id, content: fullMessage }]);

			const notifications = await notificationsFor(seller, negotiation.id, 'nova_negociacao');
			expect(notifications).toHaveLength(1);
			expect(notifications[0]).toMatchObject({
				user_id: E2E_USERS.seller.id,
				link: `/negociacoes/${negotiation.id}`,
				related_id: negotiation.id,
				is_read: false
			});

			await sellerActor.page.getByRole('button', { name: 'Notificações' }).click();
			const unreadProposalNotification = sellerActor.page
				.locator('button.preset-tonal-primary')
				.filter({ hasText: 'Nova solicitacao de negociacao' });
			await expect(unreadProposalNotification).toHaveCount(1);
		} finally {
			await Promise.all([buyerActor.context.close(), sellerActor.context.close()]);
		}
	});

	test('[NEG-02] impede negociacao no proprio anuncio pela UI e pelo banco', async ({ browser }, testInfo) => {
		const fixture = await createNegotiableProductFixture(testInfo, registry, 'NEG-02');
		const sellerActor = await createActorPage(browser, sellerStorageState);

		try {
			await submitProductProposal(sellerActor.page, fixture.productId, {
				value: 500,
				quantity: 1,
				message: 'Tentativa automatizada no proprio anuncio.'
			});
			await expect(sellerActor.page.getByText('Você não pode negociar com o próprio anúncio.')).toBeVisible();

			const { data, error } = await seller
				.from('negotiations')
				.insert({
					client_id: E2E_USERS.seller.id,
					provider_id: E2E_USERS.seller.id,
					product_id: fixture.productId,
					service_id: null,
					proposed_price: 500,
					message: 'Tentativa direta E2E no proprio anuncio.',
					status: 'solicitada'
				})
				.select('id')
				.maybeSingle();

			if (data?.id) registry.add('negotiations', data.id);
			expect(error, 'O banco/RLS deve rejeitar client_id igual a provider_id.').not.toBeNull();
		} finally {
			await sellerActor.context.close();
		}
	});

	test('[NEG-03] cria contraproposta e atualiza os termos', async ({ browser }, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NEG-03');
		const sellerActor = await createActorPage(browser, sellerStorageState);

		try {
			await sellerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await expect(sellerActor.page.getByText('Solicitada', { exact: true })).toBeVisible();
			await sellerActor.page.getByPlaceholder('Valor final').fill('1250');
			await sellerActor.page.getByRole('button', { name: 'Salvar ajustes' }).click();
			await expect(sellerActor.page.getByText('Em negociação', { exact: true })).toBeVisible();

			const { data: negotiation, error } = await seller
				.from('negotiations')
				.select('status, proposed_price')
				.eq('id', fixture.negotiationId)
				.single();
			expect(error).toBeNull();
			expect(negotiation).toEqual({ status: 'em_negociacao', proposed_price: 1250 });

		} finally {
			await sellerActor.context.close();
		}
	});

	test('[NOT-02] notifica o cliente sobre a contraproposta', async ({ browser }, testInfo) => {
		test.fail(true, 'A contraproposta ainda nao cria uma notificacao para o cliente.');
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NOT-02-CONTRA');
		const sellerActor = await createActorPage(browser, sellerStorageState);

		try {
			await sellerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await sellerActor.page.getByPlaceholder('Valor final').fill('1300');
			await sellerActor.page.getByRole('button', { name: 'Salvar ajustes' }).click();
			await expect(sellerActor.page.getByText('Em negociação', { exact: true })).toBeVisible();

			const notifications = await notificationsFor(
				buyer,
				fixture.negotiationId,
				'negociacao_contraproposta'
			);
			expect(notifications).toHaveLength(1);
		} finally {
			await sellerActor.context.close();
		}
	});

	test('[NEG-04][CHAT-02][NOT-02] aceita proposta atomicamente e encerra o chat', async ({ browser }, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NEG-04');
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const buyerActor = await createActorPage(browser, buyerStorageState);

		try {
			await sellerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await sellerActor.page.getByRole('button', { name: 'Aceitar proposta' }).click();
			const dialog = sellerActor.page.getByRole('alertdialog', { name: 'Aceitar proposta?' });
			await expect(dialog).toBeVisible();
			await dialog.getByRole('button', { name: 'Aceitar proposta' }).click();
			await expect(sellerActor.page).toHaveURL(/\/operacoes\/[^/]+$/);

			const bookings = await findBookingByNegotiation(seller, fixture.negotiationId);
			expect(bookings).toHaveLength(1);
			registry.add('bookings', bookings[0].id);
			expect(bookings[0]).toMatchObject({
				negotiation_id: fixture.negotiationId,
				client_id: E2E_USERS.buyer.id,
				provider_id: E2E_USERS.seller.id,
				product_id: fixture.productId,
				status: 'pendente',
				total_price: 900
			});

			const notifications = await notificationsFor(buyer, fixture.negotiationId, 'negociacao_aceita');
			expect(notifications).toHaveLength(1);

			await buyerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await expect(buyerActor.page.getByText('Aceita', { exact: true })).toBeVisible();
			await expect(buyerActor.page.getByText('Chat encerrado para esta negociação.')).toBeVisible();
			await expect(buyerActor.page.getByPlaceholder('Digite sua mensagem...')).toHaveCount(0);
		} finally {
			await Promise.all([sellerActor.context.close(), buyerActor.context.close()]);
		}
	});

	test('[NEG-05] impede aceite duplicado concorrente', async ({}, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NEG-05');
		const results = await Promise.all([
			seller.rpc('aceitar_negociacao', { neg_id: fixture.negotiationId }),
			seller.rpc('aceitar_negociacao', { neg_id: fixture.negotiationId })
		]);

		const successes = results.filter((result) => !result.error);
		const failures = results.filter((result) => result.error);
		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);

		const bookings = await findBookingByNegotiation(seller, fixture.negotiationId);
		expect(bookings).toHaveLength(1);
		registry.add('bookings', bookings[0].id);

		const notifications = await notificationsFor(buyer, fixture.negotiationId, 'negociacao_aceita');
		expect(notifications).toHaveLength(1);
	});

	test('[NEG-06][CHAT-02][NOT-02] recusa proposta sem criar operacao', async ({ browser }, testInfo) => {
		const fixture = await createRequestedProductNegotiationFixture(testInfo, registry, 'NEG-06');
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const buyerActor = await createActorPage(browser, buyerStorageState);

		try {
			await sellerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await sellerActor.page.getByRole('button', { name: 'Recusar' }).click();
			const dialog = sellerActor.page.getByRole('alertdialog', { name: 'Recusar proposta?' });
			await expect(dialog).toBeVisible();
			await dialog.getByRole('button', { name: 'Recusar' }).click();
			await expect(sellerActor.page.getByText('Recusada', { exact: true })).toBeVisible();

			const { data: negotiation, error } = await seller
				.from('negotiations')
				.select('status')
				.eq('id', fixture.negotiationId)
				.single();
			expect(error).toBeNull();
			expect(negotiation.status).toBe('recusada');
			expect(await findBookingByNegotiation(seller, fixture.negotiationId)).toHaveLength(0);
			expect(await notificationsFor(buyer, fixture.negotiationId, 'negociacao_recusada')).toHaveLength(1);

			await buyerActor.page.goto(`/negociacoes/${fixture.negotiationId}`);
			await expect(buyerActor.page.getByText('Chat encerrado para esta negociação.')).toBeVisible();
			await expect(buyerActor.page.getByPlaceholder('Digite sua mensagem...')).toHaveCount(0);
		} finally {
			await Promise.all([sellerActor.context.close(), buyerActor.context.close()]);
		}
	});
});
