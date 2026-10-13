import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 320, height: 800 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

async function expectNoHorizontalOverflow(page) {
	await expect
		.poll(() =>
			page.evaluate(() => ({
				documentWidth: document.documentElement.scrollWidth,
				viewportWidth: document.documentElement.clientWidth
			}))
		)
		.toMatchObject({ documentWidth: page.viewportSize().width, viewportWidth: page.viewportSize().width });
}

async function expectInsideViewport(locator, viewportWidth) {
	const box = await locator.boundingBox();
	expect(box, 'O elemento precisa possuir uma caixa visível.').not.toBeNull();
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
}

function isMarketplaceRequest(url) {
	const pathname = new URL(url).pathname;
	return ['/rest/v1/products', '/rest/v1/services', '/rest/v1/product_images'].some((path) =>
		pathname.endsWith(path)
	);
}

async function fulfillEmptyPostgrest(route) {
	await route.fulfill({
		status: 200,
		contentType: 'application/json',
		headers: { 'content-range': '0-0/0' },
		body: '[]'
	});
}

test.describe('Responsividade, acessibilidade e estados visuais', () => {
	test('[UI-01] mantém navegação, formulários, filtros e listagens utilizáveis em 320 px', async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto('/buscar');

		const bottomNavigation = page.getByRole('navigation', { name: 'Navegação principal' });
		await expect(bottomNavigation).toBeVisible();
		await expect(page.getByRole('searchbox', { name: 'Buscar no marketplace...' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Filtros' })).toBeVisible();
		await expectNoHorizontalOverflow(page);

		await page.getByRole('button', { name: 'Filtros' }).click();
		// O Dialog do filtro ainda não expõe o título como nome acessível no elemento raiz.
		// O texto visível restringe o locator sem acoplar o teste a classes internas do Skeleton.
		const filterDialog = page.getByRole('dialog').filter({ hasText: 'Filtros do marketplace' });
		await expect(filterDialog).toBeVisible();
		await expectInsideViewport(filterDialog, MOBILE_VIEWPORT.width);

		for (const name of ['Produto', 'Maquinário', 'Serviço (pacote)', 'Mão de obra']) {
			const option = filterDialog.getByRole('button', { name, exact: true }).first();
			await expect(option).toBeVisible();
			await expectInsideViewport(option, MOBILE_VIEWPORT.width);
		}
		await expectNoHorizontalOverflow(page);
		await filterDialog.getByRole('button', { name: 'Fechar filtros' }).click();

		await page.goto('/anunciar');
		await expect(page.getByRole('heading', { name: 'Novo Anúncio' })).toBeVisible();
		for (const name of ['Maquinário Agrícola', 'Insumos ou Produtos']) {
			const category = page.getByRole('radio', { name: new RegExp(name) });
			await expect(category).toBeVisible();
			await expectInsideViewport(category, MOBILE_VIEWPORT.width);
		}
		await expectNoHorizontalOverflow(page);
	});

	test('[UI-02] adapta tablet e desktop, usa a largura disponível e abre o drawer', async ({ page }) => {
		await page.setViewportSize(TABLET_VIEWPORT);
		await page.goto('/anunciar');
		await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toBeHidden();
		await expectNoHorizontalOverflow(page);

		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.goto('/buscar');

		await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
		const menuTrigger = page.getByRole('button', { name: 'Abrir menu de navegação' });
		await expect(menuTrigger).toBeVisible();

		const search = page.getByRole('searchbox', { name: 'Buscar no marketplace...' });
		await expect(search).toBeVisible();
		const searchBox = await search.boundingBox();
		expect(searchBox.width).toBeGreaterThan(1000);
		await expectNoHorizontalOverflow(page);

		await menuTrigger.click();
		const drawer = page.getByRole('dialog', { name: 'Navegação' });
		await expect(drawer).toBeVisible();
		await expect(drawer.getByRole('navigation', { name: 'Navegação principal do desktop' })).toBeVisible();
		await drawer.getByRole('link', { name: 'Início' }).click();
		await expect(page).toHaveURL('/');
		await expect(drawer).toBeHidden();
	});

	test('[UI-03] oferece foco visível, ordem lógica, contenção e fechamento por Escape', async ({ page }) => {
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.goto('/buscar');

		const menuTrigger = page.getByRole('button', { name: 'Abrir menu de navegação' });
		await page.keyboard.press('Tab');
		await expect(menuTrigger).toBeFocused();

		const focusStyle = await menuTrigger.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				outlineStyle: style.outlineStyle,
				outlineWidth: style.outlineWidth,
				boxShadow: style.boxShadow
			};
		});
		const hasVisibleFocus =
			(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px') ||
			focusStyle.boxShadow !== 'none';
		expect(hasVisibleFocus, 'O gatilho do menu deve apresentar foco visual.').toBe(true);

		await page.keyboard.press('Enter');
		const drawer = page.getByRole('dialog', { name: 'Navegação' });
		await expect(drawer).toBeVisible();

		for (let index = 0; index < 10; index += 1) {
			await page.keyboard.press('Tab');
			const focusIsInside = await drawer.evaluate((element) =>
				element.contains(document.activeElement)
			);
			expect(focusIsInside, 'O foco deve permanecer contido no drawer.').toBe(true);
		}

		await page.keyboard.press('Escape');
		await expect(drawer).toBeHidden();
		await expect(menuTrigger).toBeFocused();
	});

	test('[UI-04] apresenta skeleton, vazio e erro sem manter conteúdo obsoleto', async ({ browser }, testInfo) => {
		let releaseRequests;
		const loadingGate = new Promise((resolve) => {
			releaseRequests = resolve;
		});
		const loadingContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
		const loadingPage = await loadingContext.newPage();

		await loadingPage.route('**/rest/v1/**', async (route) => {
			if (!isMarketplaceRequest(route.request().url())) return route.continue();
			await loadingGate;
			await fulfillEmptyPostgrest(route);
		});

		try {
			await loadingPage.goto('/buscar');
			const loadingStatus = loadingPage
				.getByRole('status')
				.filter({ hasText: 'Carregando anúncios...' });
			await expect(loadingStatus).toBeVisible();
			await expect(loadingStatus.locator('.animate-pulse').first()).toBeVisible();

			releaseRequests();
			await expect(loadingPage.getByText('Nenhum anúncio encontrado', { exact: true })).toBeVisible();
			await expect(loadingStatus).toBeHidden();
			await expectNoHorizontalOverflow(loadingPage);
		} finally {
			releaseRequests();
			await loadingContext.close();
		}

		const errorContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
		const errorPage = await errorContext.newPage();
		await errorPage.route('**/rest/v1/**', async (route) => {
			if (!isMarketplaceRequest(route.request().url())) return route.continue();
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ message: `[E2E] falha simulada UI-04 ${testInfo.testId}` })
			});
		});

		try {
			await errorPage.goto('/buscar');
			await expect(errorPage.getByText('Não foi possível carregar os anúncios.', { exact: true })).toBeVisible();
			await expect(errorPage.getByRole('heading', { name: 'Resultados da busca' })).toHaveCount(0);
			await expect(errorPage.getByText('Nenhum anúncio encontrado', { exact: true })).toHaveCount(0);
			await expectNoHorizontalOverflow(errorPage);
		} finally {
			await errorContext.close();
		}
	});
});
