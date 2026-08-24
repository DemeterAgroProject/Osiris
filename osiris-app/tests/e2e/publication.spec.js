import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createE2eDataRegistry } from './support/cleanup.js';
import { E2E_AUTH_DIR, E2E_USERS } from './support/env.js';
import { signedSupabaseClient } from './support/supabase.js';

const IMAGE_URLS = {
	machinery: 'https://example.com/e2e-machinery-cover.jpg',
	product: 'https://example.com/e2e-product-cover.jpg'
};

function uniqueMarker(testInfo, domain) {
	return `[E2E] ${domain} ${testInfo.workerIndex}-${Date.now()}`;
}

async function selectFirstLoadedOption(page, selector) {
	await expect.poll(() => page.locator(`${selector} option`).count()).toBeGreaterThan(1);
	await page.locator(selector).selectOption({ index: 1 });
}

async function findProductByName(client, name) {
	const { data, error } = await client
		.from('products')
		.select(
			'id, owner_id, name, description, category, quantity, stock_unit, price, status, agricultural_machinery(id, brand_id, type_id, model, serial_number, manufacture_year, current_horimeter), product_images(id, url, is_cover)'
		)
		.eq('name', name)
		.single();

	if (error) throw new Error(`Produto E2E nao encontrado: ${error.message}`);
	return data;
}

async function findServiceByTitle(client, title) {
	const { data, error } = await client
		.from('services')
		.select('id, owner_id, title, description, service_type, pricing_model, price, location, status')
		.eq('title', title)
		.single();

	if (error) throw new Error(`Servico E2E nao encontrado: ${error.message}`);
	return data;
}

async function expectInMarketplace(page, title) {
	await page.goto(`/buscar?q=${encodeURIComponent(title)}`);
	await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
}

test.describe('Publicacao de anuncios', () => {
	test.use({ storageState: path.join(E2E_AUTH_DIR, 'seller.json') });

	let registry;
	let seller;

	test.beforeEach(async () => {
		registry = createE2eDataRegistry();
		seller = await signedSupabaseClient('seller');
	});

	test.afterEach(async () => {
		await registry.cleanup();
	});

	test('[PUB-MAQ-01] publica maquinario no inventario e marketplace', async ({ page }, testInfo) => {
		const title = `${uniqueMarker(testInfo, 'MAQ')} Trator de teste`;
		const description = 'Maquinario automatizado para validar o fluxo completo de publicacao.';
		const serialNumber = `E2E-${testInfo.workerIndex}-${Date.now()}`;

		await page.goto('/anunciar');
		await page.getByRole('radio', { name: /Maquinário Agrícola/i }).click();
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.locator('#name').fill(title);
		await page.locator('#description').fill(description);
		await selectFirstLoadedOption(page, '#type');
		await selectFirstLoadedOption(page, '#brand');
		await page.locator('#model').fill('E2E 6100J');
		await page.locator('#serial_number').fill(serialNumber);
		await page.locator('#year').fill('2022');
		await page.locator('#horimeter').fill('480');
		await page.locator('#product-image-url-0').fill(IMAGE_URLS.machinery);
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.getByRole('button', { name: /Próximo/i }).click();
		await page.getByPlaceholder('500').fill('950');
		await page.getByRole('button', { name: 'Publicar Anúncio' }).click();
		await expect(page.getByText(/Anúncio publicado com sucesso/i)).toBeVisible();

		const product = await findProductByName(seller, title);
		registry.add('products', product.id);

		expect(product).toMatchObject({
			owner_id: E2E_USERS.seller.id,
			name: title,
			description,
			category: 'Maquinário',
			quantity: 1,
			stock_unit: 'Unidade',
			price: 950,
			status: 'ativo'
		});
		expect(product.agricultural_machinery).toHaveLength(1);
		expect(product.agricultural_machinery[0]).toMatchObject({
			model: 'E2E 6100J',
			serial_number: serialNumber,
			manufacture_year: 2022,
			current_horimeter: 480
		});
		expect(product.product_images).toEqual([
			expect.objectContaining({ url: IMAGE_URLS.machinery, is_cover: true })
		]);

		await expect(page).toHaveURL(/\/inventario$/);
		await expect(page.getByText(title, { exact: true })).toBeVisible();
		await expectInMarketplace(page, title);
	});

	test('[PUB-INS-01] publica insumo sem especializacao de maquinario', async ({ page }, testInfo) => {
		const title = `${uniqueMarker(testInfo, 'INS')} Sementes de soja`;
		const description = 'Insumo automatizado para validar categoria, estoque e imagem de capa.';

		await page.goto('/anunciar');
		await page.getByRole('radio', { name: /Insumos ou Produtos/i }).click();
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.locator('#name').fill(title);
		await page.locator('#description').fill(description);
		await page.locator('#prod_category').selectOption('Sementes');
		await page.locator('#qty').fill('40');
		await page.locator('#unit').selectOption('Sacas');
		await page.locator('#product-image-url-0').fill(IMAGE_URLS.product);
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.getByRole('button', { name: /Próximo/i }).click();
		await page.getByPlaceholder('500').fill('275');
		await page.getByRole('button', { name: 'Publicar Anúncio' }).click();
		await expect(page.getByText(/Anúncio publicado com sucesso/i)).toBeVisible();

		const product = await findProductByName(seller, title);
		registry.add('products', product.id);

		expect(product).toMatchObject({
			owner_id: E2E_USERS.seller.id,
			name: title,
			description,
			category: 'Sementes',
			quantity: 40,
			stock_unit: 'Sacas',
			price: 275,
			status: 'ativo'
		});
		expect(product.agricultural_machinery).toHaveLength(0);
		expect(product.product_images).toEqual([
			expect.objectContaining({ url: IMAGE_URLS.product, is_cover: true })
		]);

		await expect(page).toHaveURL(/\/inventario$/);
		await page.getByRole('tab', { name: /Produtos/i }).click();
		await expect(page.getByText(title, { exact: true })).toBeVisible();
		await expectInMarketplace(page, title);
	});

	test('[PUB-SERV-01] publica servico no painel e marketplace', async ({ page }, testInfo) => {
		const title = `${uniqueMarker(testInfo, 'SERV')} Plantio assistido`;
		const description = 'Servico automatizado com equipe e maquinario inclusos para plantio.';
		const location = 'Alegrete e Região, RS';

		await page.goto('/servicos/novo');
		await page.getByRole('radio', { name: /Pacote Completo/i }).click();
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.locator('#title').fill(title);
		await page.locator('#description').fill(description);
		await page.locator('#location').fill(location);
		await page.getByRole('button', { name: /Próximo/i }).click();

		await page.locator('#pricing_model').selectOption('Por Hectare');
		await page.locator('#price').fill('180');
		await page.getByRole('button', { name: 'Publicar Serviço' }).click();
		await expect(page.getByText(/Serviço publicado com sucesso/i)).toBeVisible();

		const service = await findServiceByTitle(seller, title);
		registry.add('services', service.id);

		expect(service).toEqual({
			id: service.id,
			owner_id: E2E_USERS.seller.id,
			title,
			description,
			service_type: 'Pacote Completo',
			pricing_model: 'Por Hectare',
			price: 180,
			location,
			status: 'ativo'
		});

		await expect(page).toHaveURL(/\/servicos$/);
		await page.getByRole('tab', { name: /Pacote Completo/i }).click();
		await expect(page.getByText(title, { exact: true })).toBeVisible();
		await expectInMarketplace(page, title);
	});
});
