import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.js',
	timeout: 60_000,
	expect: {
		timeout: 10_000
	},
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// A suite compartilha dois usuarios tecnicos e o mesmo banco de desenvolvimento.
	// Os cenarios usam contextos simultaneos internamente, mas arquivos paralelos
	// disputariam notificacoes e outros registros desses mesmos usuarios.
	workers: 1,
	reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
