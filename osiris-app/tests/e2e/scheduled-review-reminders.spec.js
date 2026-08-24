import { expect, test } from '@playwright/test';
import { createE2eDataRegistry } from './support/cleanup.js';
import { E2E_USERS } from './support/env.js';
import {
	adminSupabaseClient,
	createAcceptedProductBookingFixture
} from './support/supabase.js';

function addHours(date, hours) {
	return new Date(date.getTime() + hours * 60 * 60 * 1_000);
}

async function prepareReviewWindow(admin, bookingId, scheduledEndAt) {
	const { error } = await admin
		.from('bookings')
		.update({
			status: 'em_avaliacao',
			scheduled_end_at: scheduledEndAt.toISOString()
		})
		.eq('id', bookingId);

	if (error) {
		throw new Error(`Falha ao preparar prazo de avaliacao E2E: ${error.message}`);
	}
}

async function runReminderJob(admin, now) {
	const { data, error } = await admin.rpc('send_due_review_reminders', {
		p_now: now.toISOString()
	});

	if (error) {
		throw new Error(`Falha ao executar lembretes de avaliacao E2E: ${error.message}`);
	}

	return data;
}

async function reviewReminders(admin, bookingId) {
	const { data, error } = await admin
		.from('notifications')
		.select('id, user_id, type, title, body, link, related_id, is_read')
		.eq('related_id', bookingId)
		.eq('type', 'solicitacao_avaliacao')
		.order('user_id');

	if (error) {
		throw new Error(`Falha ao consultar lembretes de avaliacao E2E: ${error.message}`);
	}

	return data;
}

test.describe('Lembretes agendados de avaliacao', () => {
	let registry;
	let admin;

	test.beforeEach(() => {
		registry = createE2eDataRegistry();
		admin = adminSupabaseClient();
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[AGD-01] nao notifica antes de termino previsto mais 24 horas', async ({}, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const scheduledEndAt = new Date();
		await prepareReviewWindow(admin, fixture.bookingId, scheduledEndAt);

		const inserted = await runReminderJob(admin, addHours(scheduledEndAt, 24 - 1 / 3_600));

		expect(inserted).toBe(0);
		expect(await reviewReminders(admin, fixture.bookingId)).toHaveLength(0);
	});

	test('[AGD-02] notifica ambos os participantes exatamente apos 24 horas', async ({}, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const scheduledEndAt = new Date();
		await prepareReviewWindow(admin, fixture.bookingId, scheduledEndAt);

		const inserted = await runReminderJob(admin, addHours(scheduledEndAt, 24));
		const notifications = await reviewReminders(admin, fixture.bookingId);

		expect(inserted).toBe(2);
		expect(notifications).toHaveLength(2);
		expect(notifications).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					user_id: E2E_USERS.buyer.id,
					link: `/operacoes/${fixture.bookingId}`,
					related_id: fixture.bookingId,
					is_read: false
				}),
				expect.objectContaining({
					user_id: E2E_USERS.seller.id,
					link: `/operacoes/${fixture.bookingId}`,
					related_id: fixture.bookingId,
					is_read: false
				})
			])
		);
	});

	test('[AGD-03] e idempotente e ignora participante que ja avaliou', async ({}, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const scheduledEndAt = new Date();
		await prepareReviewWindow(admin, fixture.bookingId, scheduledEndAt);

		const { error: reviewError } = await fixture.buyer.from('reviews').insert({
			booking_id: fixture.bookingId,
			reviewer_id: E2E_USERS.buyer.id,
			reviewee_id: E2E_USERS.seller.id,
			rating: 5,
			comment: `${fixture.marker} Avaliacao anterior ao lembrete.`
		});
		expect(reviewError).toBeNull();

		const dueAt = addHours(scheduledEndAt, 24);
		expect(await runReminderJob(admin, dueAt)).toBe(1);
		expect(await runReminderJob(admin, addHours(dueAt, 1))).toBe(0);

		const notifications = await reviewReminders(admin, fixture.bookingId);
		expect(notifications).toHaveLength(1);
		expect(notifications[0].user_id).toBe(E2E_USERS.seller.id);
	});

	test('[AGD-04] nao cria lembrete redundante para operacao cancelada', async ({}, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo, registry);
		const scheduledEndAt = new Date();
		const { error: scheduleError } = await admin
			.from('bookings')
			.update({ scheduled_end_at: scheduledEndAt.toISOString() })
			.eq('id', fixture.bookingId);
		expect(scheduleError).toBeNull();

		const { error: cancellationError } = await fixture.buyer.rpc('cancel_booking', {
			p_booking_id: fixture.bookingId,
			p_cancellation_reason: 'logistical_issue',
			p_cancellation_reason_details: null
		});
		expect(cancellationError).toBeNull();

		expect(await runReminderJob(admin, addHours(scheduledEndAt, 48))).toBe(0);
		expect(await reviewReminders(admin, fixture.bookingId)).toHaveLength(0);

		const { data: cancellationNotifications, error: notificationError } = await admin
			.from('notifications')
			.select('id, user_id, type, related_id')
			.eq('related_id', fixture.bookingId)
			.eq('type', 'operacao_cancelada');
		expect(notificationError).toBeNull();
		expect(cancellationNotifications).toHaveLength(1);
		expect(cancellationNotifications[0].user_id).toBe(E2E_USERS.seller.id);
	});
});
