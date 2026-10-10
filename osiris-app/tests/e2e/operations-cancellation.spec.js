import path from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_AUTH_DIR, E2E_USERS } from './support/env.js';
import { createE2eDataRegistry } from './support/cleanup.js';
import {
	adminSupabaseClient,
	createAcceptedProductBookingFixture
} from './support/supabase.js';

const buyerStorageState = path.join(E2E_AUTH_DIR, 'buyer.json');
const sellerStorageState = path.join(E2E_AUTH_DIR, 'seller.json');

async function createActorPage(browser, storageState) {
	const context = await browser.newContext({ storageState });
	return { context, page: await context.newPage() };
}

async function cancelBooking(client, bookingId, reason = 'logistical_issue', details = null) {
	const { error } = await client.rpc('cancel_booking', {
		p_booking_id: bookingId,
		p_cancellation_reason: reason,
		p_cancellation_reason_details: details
	});
	if (error) throw new Error(`Falha ao preparar cancelamento E2E: ${error.message}`);
}

async function submitDefaultReview(page, comment) {
	await page.getByPlaceholder('Comentário opcional...').fill(comment);
	await page.getByRole('button', { name: 'Enviar avaliação' }).click();
	await expect(page.getByText(/Você já enviou sua avaliação/)).toBeVisible();
}

test.describe('Operacoes - cancelamento', () => {
	test.use({ storageState: buyerStorageState });
	let registry;

	test.beforeEach(() => {
		registry = createE2eDataRegistry();
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[CAN-01][CAN-03][CAN-05][NOT-05] cancela com motivo predefinido', async ({ page }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);

		await page.goto(`/operacoes/${fixture.bookingId}`);

		await expect(page.getByText(fixture.productName)).toBeVisible();
		await expect(page.getByText('Aguardando início', { exact: true })).toBeVisible();

		await page.getByRole('button', { name: /Cancelar/i }).click();
		await expect(page.getByRole('alertdialog', { name: /Cancelar operação/i })).toBeVisible();

		await page.locator('#cancellation-reason').selectOption('other');
		await page.locator('#cancellation-details').fill('curto');
		await page.getByRole('button', { name: /Confirmar/i }).click();
		await expect(page.getByText(/15 caracteres/i)).toBeVisible();

		await page.locator('#cancellation-reason').selectOption('logistical_issue');
		await page.getByRole('button', { name: /Confirmar/i }).click();

		await expect(page.getByText(/^Cancelado$/i)).toBeVisible();
		await expect(page.getByText(/Falha log/i)).toBeVisible();
		await expect(page.getByRole('heading', { name: /Avaliar/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Enviar/i })).toBeVisible();

		const { data: booking, error: bookingError } = await fixture.buyer
			.from('bookings')
			.select('id, status, cancellation_reason, cancellation_reason_details, cancelled_by, cancelled_at')
			.eq('id', fixture.bookingId)
			.single();

		expect(bookingError).toBeNull();
		expect(booking).toMatchObject({
			status: 'cancelado',
			cancellation_reason: 'logistical_issue',
			cancellation_reason_details: null,
			cancelled_by: E2E_USERS.buyer.id
		});
		expect(booking.cancelled_at).toBeTruthy();

		const { data: notifications, error: notificationsError } = await fixture.seller
			.from('notifications')
			.select('id, user_id, type, body, link, related_id, updated_at, created_at')
			.eq('related_id', fixture.bookingId)
			.eq('type', 'operacao_cancelada')
			.eq('is_read', false);

		expect(notificationsError).toBeNull();
		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatchObject({
			user_id: E2E_USERS.seller.id,
			related_id: fixture.bookingId
		});
		expect(notifications[0].body).toContain('Sua operacao foi cancelada');
	});

	test('[CAN-02] cancela usando Outro e persiste os detalhes separados', async ({ page }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const typedDetails = '  Estrada rural bloqueada durante o transporte.  ';
		const expectedDetails = typedDetails.trim();

		await page.goto(`/operacoes/${fixture.bookingId}`);
		await expect(page.getByText(fixture.productName)).toBeVisible();

		await page.getByRole('button', { name: /Cancelar/i }).click();
		await expect(page.getByRole('alertdialog', { name: /Cancelar operação/i })).toBeVisible();

		await page.locator('#cancellation-reason').selectOption('other');
		await expect(page.locator('#cancellation-details')).toBeVisible();
		await page.locator('#cancellation-details').fill(typedDetails);
		await page.getByRole('button', { name: /Confirmar/i }).click();

		await expect(page.getByText(/^Cancelado$/i)).toBeVisible();
		await expect(page.getByText('Motivo: Outro', { exact: true })).toBeVisible();
		await expect(page.getByText(expectedDetails, { exact: true })).toBeVisible();

		const { data: booking, error } = await fixture.buyer
			.from('bookings')
			.select('status, cancellation_reason, cancellation_reason_details, cancelled_by')
			.eq('id', fixture.bookingId)
			.single();

		expect(error).toBeNull();
		expect(booking).toEqual({
			status: 'cancelado',
			cancellation_reason: 'other',
			cancellation_reason_details: expectedDetails,
			cancelled_by: E2E_USERS.buyer.id
		});
	});

	test('[CAN-04] contraparte visualiza motivo, detalhes e data do cancelamento', async ({ browser }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const details = 'Caminhao prancha indisponivel para realizar o transporte.';
		await cancelBooking(fixture.buyer, fixture.bookingId, 'other', details);
		const sellerActor = await createActorPage(browser, sellerStorageState);

		try {
			await sellerActor.page.goto(`/operacoes/${fixture.bookingId}`);
			await expect(sellerActor.page.getByText('Motivo: Outro', { exact: true })).toBeVisible();
			await expect(sellerActor.page.getByText(details, { exact: true })).toBeVisible();
			await expect(sellerActor.page.getByText(/Cancelado em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
		} finally {
			await sellerActor.context.close();
		}
	});

	test('[CAN-04] contraparte visualiza o autor do cancelamento', async ({ browser }, testInfo) => {
		test.fail(true, 'A tela ainda nao apresenta o perfil identificado por cancelled_by.');
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		await cancelBooking(fixture.buyer, fixture.bookingId, 'withdrawal');
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const { data: buyerProfile, error } = await fixture.buyer
			.from('profiles')
			.select('display_name')
			.eq('id', E2E_USERS.buyer.id)
			.single();
		expect(error).toBeNull();

		try {
			await sellerActor.page.goto(`/operacoes/${fixture.bookingId}`);
			await expect(
				sellerActor.page.getByText(`Cancelado por ${buyerProfile.display_name}`, { exact: true })
			).toBeVisible();
		} finally {
			await sellerActor.context.close();
		}
	});

	test('[CAN-05] libera avaliacao imediatamente para cliente e prestador', async ({ browser }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		await cancelBooking(fixture.buyer, fixture.bookingId, 'weather_conditions');
		const buyerActor = await createActorPage(browser, buyerStorageState);
		const sellerActor = await createActorPage(browser, sellerStorageState);

		try {
			await Promise.all([
				buyerActor.page.goto(`/operacoes/${fixture.bookingId}`),
				sellerActor.page.goto(`/operacoes/${fixture.bookingId}`)
			]);
			for (const actor of [buyerActor, sellerActor]) {
				await expect(actor.page.getByRole('heading', { name: 'Avaliar experiência' })).toBeVisible();
				await expect(actor.page.getByPlaceholder('Comentário opcional...')).toBeVisible();
				await expect(actor.page.getByRole('button', { name: 'Enviar avaliação' })).toBeEnabled();
			}
		} finally {
			await Promise.all([buyerActor.context.close(), sellerActor.context.close()]);
		}
	});

	test('[CAN-06][AVL-01] preserva cancelado depois de uma avaliacao por participante', async ({ browser }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		await cancelBooking(fixture.buyer, fixture.bookingId, 'commercial_disagreement');
		const buyerActor = await createActorPage(browser, buyerStorageState);
		const sellerActor = await createActorPage(browser, sellerStorageState);
		const buyerComment = `${fixture.marker} Avaliacao feita pelo cliente.`;
		const sellerComment = `${fixture.marker} Avaliacao feita pelo prestador.`;

		try {
			await buyerActor.page.goto(`/operacoes/${fixture.bookingId}`);
			await submitDefaultReview(buyerActor.page, buyerComment);

			await sellerActor.page.goto(`/operacoes/${fixture.bookingId}`);
			await submitDefaultReview(sellerActor.page, sellerComment);

			const { data: reviews, error: reviewsError } = await fixture.buyer
				.from('reviews')
				.select('reviewer_id, reviewee_id, rating, comment')
				.eq('booking_id', fixture.bookingId)
				.order('reviewer_id');
			expect(reviewsError).toBeNull();
			expect(reviews).toHaveLength(2);
			expect(reviews).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						reviewer_id: E2E_USERS.buyer.id,
						reviewee_id: E2E_USERS.seller.id,
						rating: 5,
						comment: buyerComment
					}),
					expect.objectContaining({
						reviewer_id: E2E_USERS.seller.id,
						reviewee_id: E2E_USERS.buyer.id,
						rating: 5,
						comment: sellerComment
					})
				])
			);

			const { data: booking, error: bookingError } = await fixture.buyer
				.from('bookings')
				.select('status')
				.eq('id', fixture.bookingId)
				.single();
			expect(bookingError).toBeNull();
			expect(booking.status).toBe('cancelado');

			await buyerActor.page.reload();
			await expect(buyerActor.page.getByText(/^Cancelado$/)).toBeVisible();
			await expect(buyerActor.page.getByText(/Você já enviou sua avaliação/)).toBeVisible();
			await expect(buyerActor.page.getByText(buyerComment, { exact: true })).toBeVisible();
			await expect(buyerActor.page.getByText(sellerComment, { exact: true })).toBeVisible();

			const { error: duplicateError } = await fixture.buyer.from('reviews').insert({
				booking_id: fixture.bookingId,
				reviewer_id: E2E_USERS.buyer.id,
				reviewee_id: E2E_USERS.seller.id,
				rating: 1,
				comment: 'Duplicada E2E'
			});
			expect(duplicateError, 'Uma parte nao pode avaliar duas vezes a mesma operacao.').not.toBeNull();

			const { error: selfReviewError } = await fixture.buyer.from('reviews').insert({
				booking_id: fixture.bookingId,
				reviewer_id: E2E_USERS.buyer.id,
				reviewee_id: E2E_USERS.buyer.id,
				rating: 5,
				comment: 'Autoavaliacao E2E'
			});
			expect(selfReviewError, 'Autoavaliacao deve ser rejeitada.').not.toBeNull();
		} finally {
			await Promise.all([buyerActor.context.close(), sellerActor.context.close()]);
		}
	});

	test('[CAN-07] rejeita cancelamentos invalidos no banco', async ({}, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);

		const { error: unknownReasonError } = await fixture.buyer.rpc('cancel_booking', {
			p_booking_id: fixture.bookingId,
			p_cancellation_reason: 'unknown_reason',
			p_cancellation_reason_details: null
		});
		expect(unknownReasonError).not.toBeNull();

		const { error: missingAuthorError } = await fixture.buyer
			.from('bookings')
			.update({
				status: 'cancelado',
				cancellation_reason: 'withdrawal',
				cancelled_by: null
			})
			.eq('id', fixture.bookingId);
		expect(missingAuthorError).not.toBeNull();

		const { error: shortOtherError } = await fixture.buyer.rpc('cancel_booking', {
			p_booking_id: fixture.bookingId,
			p_cancellation_reason: 'other',
			p_cancellation_reason_details: 'muito curto'
		});
		expect(shortOtherError).not.toBeNull();

		const admin = adminSupabaseClient();
		const { data: unrelatedProfile, error: unrelatedProfileError } = await admin
			.from('profiles')
			.select('id')
			.neq('id', E2E_USERS.buyer.id)
			.neq('id', E2E_USERS.seller.id)
			.limit(1)
			.single();
		expect(unrelatedProfileError).toBeNull();
		const { error: unrelatedAuthorError } = await admin
			.from('bookings')
			.update({
				status: 'cancelado',
				cancellation_reason: 'withdrawal',
				cancelled_by: unrelatedProfile.id
			})
			.eq('id', fixture.bookingId);
		expect(unrelatedAuthorError).not.toBeNull();

		await cancelBooking(fixture.buyer, fixture.bookingId, 'withdrawal');
		const { error: repeatedCancellationError } = await fixture.seller.rpc('cancel_booking', {
			p_booking_id: fixture.bookingId,
			p_cancellation_reason: 'mechanical_issue',
			p_cancellation_reason_details: null
		});
		expect(repeatedCancellationError).not.toBeNull();

		const { data: booking, error: bookingError } = await fixture.buyer
			.from('bookings')
			.select('status, cancellation_reason, cancelled_by')
			.eq('id', fixture.bookingId)
			.single();
		expect(bookingError).toBeNull();
		expect(booking).toEqual({
			status: 'cancelado',
			cancellation_reason: 'withdrawal',
			cancelled_by: E2E_USERS.buyer.id
		});
	});
});
