import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { E2E_AUTH_DIR, E2E_USERS, loadE2eEnv, supabaseAuthStorageKey } from './support/env.js';

async function writeStorageState({ email, password, outputFile, origin }) {
	const env = loadE2eEnv();
	const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error || !data.session) {
		throw new Error(`Falha ao autenticar ${email}: ${error?.message ?? 'sessao nao retornada'}`);
	}

	const storageState = {
		cookies: [],
		origins: [
			{
				origin,
				localStorage: [
					{
						name: supabaseAuthStorageKey(env.supabaseUrl),
						value: JSON.stringify(data.session)
					}
				]
			}
		]
	};

	fs.writeFileSync(outputFile, JSON.stringify(storageState, null, 2));
}

export default async function globalSetup(config) {
	const env = loadE2eEnv();
	const origin =
		config.projects[0]?.use?.baseURL ??
		process.env.PLAYWRIGHT_BASE_URL ??
		'http://127.0.0.1:4173';

	fs.mkdirSync(E2E_AUTH_DIR, { recursive: true });

	await Promise.all([
		writeStorageState({
			email: E2E_USERS.buyer.email,
			password: env.e2ePassword,
			outputFile: path.join(E2E_AUTH_DIR, 'buyer.json'),
			origin
		}),
		writeStorageState({
			email: E2E_USERS.seller.email,
			password: env.e2ePassword,
			outputFile: path.join(E2E_AUTH_DIR, 'seller.json'),
			origin
		})
	]);
}
