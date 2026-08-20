import fs from 'node:fs';
import path from 'node:path';

export const E2E_AUTH_DIR = path.resolve('.playwright/.auth');

export const E2E_USERS = {
	buyer: {
		id: '11111111-1111-4111-8111-111111111111',
		email: 'comprador-e2e@teste.com'
	},
	seller: {
		id: '22222222-2222-4222-8222-222222222222',
		email: 'vendedor-e2e@teste.com'
	}
};

function parseDotEnv(content) {
	return Object.fromEntries(
		content
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith('#') && line.includes('='))
			.map((line) => {
				const index = line.indexOf('=');
				const key = line.slice(0, index).trim();
				const rawValue = line.slice(index + 1).trim();
				const value = rawValue.replace(/^['"]|['"]$/g, '');
				return [key, value];
			})
	);
}

export function loadE2eEnv() {
	const envPath = path.resolve('.env');
	const fileEnv = fs.existsSync(envPath) ? parseDotEnv(fs.readFileSync(envPath, 'utf8')) : {};

	const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? fileEnv.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.PUBLIC_SUPABASE_ANON_KEY;
	const e2ePassword = process.env.OSIRIS_E2E_PASSWORD ?? fileEnv.OSIRIS_E2E_PASSWORD ?? 'OsirisE2E!2026';

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Defina PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY no .env ou nas variaveis de ambiente.'
		);
	}

	return { supabaseUrl, supabaseAnonKey, e2ePassword };
}

export function supabaseAuthStorageKey(supabaseUrl) {
	const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
	return `sb-${projectRef}-auth-token`;
}
