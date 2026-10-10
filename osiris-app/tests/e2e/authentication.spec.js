import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createE2eDataRegistry } from './support/cleanup.js';
import {
	E2E_AUTH_DIR,
	E2E_USERS,
	loadE2eEnv,
	supabaseAuthStorageKey
} from './support/env.js';
import {
	createNegotiableProductFixture,
	passwordSupabaseClient,
	signedSupabaseClient
} from './support/supabase.js';

const buyerStorageState = path.join(E2E_AUTH_DIR, 'buyer.json');

function readBuyerLocalStorage() {
	const storageState = JSON.parse(fs.readFileSync(buyerStorageState, 'utf8'));
	const entries = storageState.origins?.flatMap((origin) => origin.localStorage ?? []) ?? [];
	if (entries.length === 0) {
		throw new Error('O storageState do comprador nao possui uma sessao local para o AUTH-03.');
	}
	return entries;
}

async function createDisposableBuyerStorageState(baseURL, { renew = false } = {}) {
	const client = renew
		? await passwordSupabaseClient('buyer')
		: await signedSupabaseClient('buyer');
	const {
		data: { session },
		error
	} = await client.auth.getSession();
	if (error || !session) {
		throw new Error(`Falha ao criar sessao descartavel para AUTH-04: ${error?.message ?? 'sem sessao'}`);
	}

	const env = loadE2eEnv();
	return {
		cookies: [],
		origins: [
			{
				origin: new URL(baseURL).origin,
				localStorage: [
					{
						name: supabaseAuthStorageKey(env.supabaseUrl),
						value: JSON.stringify(session)
					}
				]
			}
		]
	};
}

test.describe('Autenticacao tecnica', () => {
	let registry;

	test.beforeEach(() => {
		registry = createE2eDataRegistry();
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[AUTH-03] retoma a pagina original e rejeita redirecionamento externo', async ({ browser }, testInfo) => {
		const fixture = await createNegotiableProductFixture(testInfo, registry, 'AUTH-03');
		const context = await browser.newContext();
		const page = await context.newPage();
		const authenticatedContext = await browser.newContext({
			storageState: buyerStorageState
		});
		await authenticatedContext.addInitScript(() => {
			Object.defineProperty(navigator, 'serviceWorker', {
				configurable: true,
				value: { register: async () => ({}) }
			});
			if ('Notification' in window) {
				Object.defineProperty(Notification, 'permission', {
					configurable: true,
					value: 'denied'
				});
				Object.defineProperty(Notification, 'requestPermission', {
					configurable: true,
					value: async () => 'denied'
				});
			}
		});
		const authenticatedPage = await authenticatedContext.newPage();
		const unsafeRedirectContext = await browser.newContext();
		const unsafeRedirectPage = await unsafeRedirectContext.newPage();
		const originalPath = `/anuncio/produto/${fixture.productId}`;

		try {
			await page.goto(originalPath);
			const favoriteButton = page.getByRole('button', { name: 'Salvar anúncio' });
			await expect(favoriteButton).toBeEnabled();
			await favoriteButton.click();
			await expect(page).toHaveURL(
				`/login?redirect=${encodeURIComponent(originalPath)}`
			);
			await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible();

			const returnUrl = page.url();
			await authenticatedPage.goto(returnUrl);
			await expect(authenticatedPage).toHaveURL(originalPath, { timeout: 30_000 });
			await expect(
				authenticatedPage.getByRole('heading', { name: fixture.productName })
			).toBeVisible();

			await unsafeRedirectPage.goto('/login?redirect=%2F%2Fevil.example%2Fcaptura');
			await expect(
				unsafeRedirectPage.getByRole('button', { name: 'Continuar com Google' })
			).toBeVisible();
			expect(new URL(unsafeRedirectPage.url()).hostname).toBe('127.0.0.1');
			expect(new URL(unsafeRedirectPage.url()).pathname).toBe('/login');
		} finally {
			await Promise.all([
				context.close(),
				authenticatedContext.close(),
				unsafeRedirectContext.close()
			]);
		}
	});

	test('[AUTH-04] encerra a sessao e protege dados privados', async ({ browser }, testInfo) => {
		const baseURL = testInfo.project.use.baseURL;
		const disposableStorageState = await createDisposableBuyerStorageState(
			baseURL
		);
		const context = await browser.newContext({ storageState: disposableStorageState });
		const page = await context.newPage();
		const [authEntry] = disposableStorageState.origins[0].localStorage;

		try {
			await page.goto('/');
			await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
			await expect(page.getByText(E2E_USERS.buyer.email, { exact: true })).toBeVisible();
			await page.getByRole('menuitem', { name: /Sair da conta/i }).click();

			await expect(page).toHaveURL('/login');
			await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible();
			await expect(page.getByRole('button', { name: 'Fazer login' })).toBeVisible();
			expect(await page.evaluate((key) => localStorage.getItem(key), authEntry.name)).toBeNull();

			await page.goto('/favoritos');
			await expect(page).toHaveURL('/login?redirect=/favoritos');
			await expect(page.getByText('Bem-vindo de volta', { exact: true })).toBeVisible();
		} finally {
			await context.close();
			const restoredStorageState = await createDisposableBuyerStorageState(baseURL, {
				renew: true
			});
			fs.writeFileSync(buyerStorageState, JSON.stringify(restoredStorageState, null, 2));
		}
	});
});
