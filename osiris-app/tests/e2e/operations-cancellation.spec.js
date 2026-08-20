import path from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_AUTH_DIR, E2E_USERS } from './support/env.js';
import { createAcceptedProductBookingFixture } from './support/supabase.js';

test.describe('Operacoes - cancelamento', () => {
	test.use({ storageState: path.join(E2E_AUTH_DIR, 'buyer.json') });

	test('cancela uma operacao aceita com motivo estruturado e libera avaliacao', async ({ page }, testInfo) => {
		const fixture = await createAcceptedProductBookingFixture(testInfo);

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
});
