import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
	E2E_AUTH_DIR,
	E2E_USERS,
	loadE2eEnv,
	supabaseAuthStorageKey
} from './env.js';

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function toDateOnly(date) {
	return date.toISOString().slice(0, 10);
}

function createAnonymousClient(env) {
	return createClient(env.supabaseUrl, env.supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

function readStoredSession(role, env) {
	const storageFile = path.join(E2E_AUTH_DIR, `${role}.json`);
	if (!fs.existsSync(storageFile)) {
		throw new Error(`Sessao E2E ausente para ${role}. Execute o globalSetup do Playwright.`);
	}

	const storageState = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
	const storageKey = supabaseAuthStorageKey(env.supabaseUrl);
	const entry = storageState.origins
		?.flatMap((origin) => origin.localStorage ?? [])
		.find((item) => item.name === storageKey);
	const session = entry?.value ? JSON.parse(entry.value) : null;

	if (!session?.access_token || !session?.refresh_token) {
		throw new Error(`Token E2E invalido ou ausente para ${role}.`);
	}

	return session;
}

export async function signedSupabaseClient(role) {
	const env = loadE2eEnv();
	const user = E2E_USERS[role];

	if (!user) {
		throw new Error(`Usuario E2E desconhecido: ${role}`);
	}

	const supabase = createAnonymousClient(env);
	const session = readStoredSession(role, env);
	const { error } = await supabase.auth.setSession({
		access_token: session.access_token,
		refresh_token: session.refresh_token
	});

	if (error) {
		throw new Error(`Falha ao restaurar a sessao de ${user.email}: ${error.message}`);
	}

	return supabase;
}

export async function passwordSupabaseClient(role) {
	const env = loadE2eEnv();
	const user = E2E_USERS[role];

	if (!user) {
		throw new Error(`Usuario E2E desconhecido: ${role}`);
	}

	const supabase = createAnonymousClient(env);

	const { error } = await supabase.auth.signInWithPassword({
		email: user.email,
		password: env.e2ePassword
	});

	if (error) {
		throw new Error(`Falha ao autenticar ${user.email}: ${error.message}`);
	}

	return supabase;
}

export function adminSupabaseClient() {
	const env = loadE2eEnv({ requireServiceRole: true });
	return createClient(env.supabaseUrl, env.serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export async function createTemporaryE2eUser(testInfo, registry, label = 'OUTSIDER') {
	const env = loadE2eEnv({ requireServiceRole: true });
	const admin = adminSupabaseClient();
	const nonce = `${testInfo.workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const email = `${label.toLowerCase()}-${nonce}@teste.com`;

	const { data, error } = await admin.auth.admin.createUser({
		email,
		password: env.e2ePassword,
		email_confirm: true,
		user_metadata: { name: `[E2E] ${label}` }
	});

	if (error || !data.user) {
		throw new Error(`Falha ao criar usuario temporario E2E: ${error?.message ?? 'usuario ausente'}`);
	}
	registry?.add('authUsers', data.user.id);

	const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const { error: signInError } = await client.auth.signInWithPassword({
		email,
		password: env.e2ePassword
	});
	if (signInError) {
		throw new Error(`Falha ao autenticar usuario temporario E2E: ${signInError.message}`);
	}

	return { id: data.user.id, email, client };
}

function resolveRpcUuid(data) {
	if (!data) return null;
	if (typeof data === 'string') return data;
	if (typeof data === 'object' && data.id) return data.id;
	return String(data);
}

export async function createAcceptedProductBookingFixture(testInfo, registry) {
	const buyer = await signedSupabaseClient('buyer');
	const seller = await signedSupabaseClient('seller');
	const marker = `[E2E] ${testInfo.workerIndex}-${Date.now()}`;
	const startDate = toDateOnly(addDays(new Date(), 7));
	const endDate = toDateOnly(addDays(new Date(), 9));

	const { data: product, error: productError } = await seller
		.from('products')
		.insert({
			owner_id: E2E_USERS.seller.id,
			name: `${marker} Produto para cancelamento`,
			description: `${marker} Massa automatizada para teste de cancelamento de operacao.`,
			quantity: 10,
			stock_unit: 'Sacas',
			category: 'Sementes',
			price: 250,
			status: 'ativo'
		})
		.select('id, name')
		.single();

	if (productError) {
		throw new Error(`Falha ao criar produto E2E: ${productError.message}`);
	}
	registry?.add('products', product.id);

	const { data: negotiation, error: negotiationError } = await buyer
		.from('negotiations')
		.insert({
			client_id: E2E_USERS.buyer.id,
			provider_id: E2E_USERS.seller.id,
			product_id: product.id,
			service_id: null,
			proposed_start_date: startDate,
			proposed_end_date: endDate,
			proposed_price: 750,
			message: `${marker} Negociacao criada pelo Playwright.`,
			status: 'solicitada'
		})
		.select('id')
		.single();

	if (negotiationError) {
		throw new Error(`Falha ao criar negociacao E2E: ${negotiationError.message}`);
	}
	registry?.add('negotiations', negotiation.id);

	const { data: rpcData, error: acceptError } = await seller.rpc('aceitar_negociacao', {
		neg_id: negotiation.id
	});

	if (acceptError) {
		throw new Error(`Falha ao aceitar negociacao E2E: ${acceptError.message}`);
	}

	const bookingId = resolveRpcUuid(rpcData);

	if (!bookingId) {
		throw new Error('RPC aceitar_negociacao nao retornou o ID da operacao.');
	}
	registry?.add('bookings', bookingId);

	return {
		buyer,
		seller,
		marker,
		productId: product.id,
		productName: product.name,
		negotiationId: negotiation.id,
		bookingId
	};
}

export async function createNegotiableProductFixture(testInfo, registry, label = 'Negociacao') {
	const seller = await signedSupabaseClient('seller');
	const marker = `[E2E] ${label} ${testInfo.workerIndex}-${Date.now()}`;

	const { data: product, error } = await seller
		.from('products')
		.insert({
			owner_id: E2E_USERS.seller.id,
			name: `${marker} Produto negociavel`,
			description: `${marker} Massa automatizada para o fluxo de negociacao.`,
			quantity: 50,
			stock_unit: 'Sacas',
			category: 'Sementes',
			price: 300,
			status: 'ativo'
		})
		.select('id, name')
		.single();

	if (error) {
		throw new Error(`Falha ao criar produto negociavel E2E: ${error.message}`);
	}

	registry?.add('products', product.id);
	return { seller, marker, productId: product.id, productName: product.name };
}

export async function createRequestedProductNegotiationFixture(testInfo, registry, label = 'Proposta') {
	const productFixture = await createNegotiableProductFixture(testInfo, registry, label);
	const buyer = await signedSupabaseClient('buyer');
	const startDate = toDateOnly(addDays(new Date(), 7));
	const endDate = toDateOnly(addDays(new Date(), 9));
	const message = `${productFixture.marker} Proposta inicial criada pelo Playwright.`;

	const { data: negotiation, error } = await buyer
		.from('negotiations')
		.insert({
			client_id: E2E_USERS.buyer.id,
			provider_id: E2E_USERS.seller.id,
			product_id: productFixture.productId,
			service_id: null,
			proposed_start_date: startDate,
			proposed_end_date: endDate,
			proposed_price: 900,
			message,
			status: 'solicitada'
		})
		.select('id')
		.single();

	if (error) {
		throw new Error(`Falha ao criar negociacao solicitada E2E: ${error.message}`);
	}
	registry?.add('negotiations', negotiation.id);

	const { error: messageError } = await buyer.from('negotiation_messages').insert({
		negotiation_id: negotiation.id,
		sender_id: E2E_USERS.buyer.id,
		content: message
	});

	if (messageError) {
		throw new Error(`Falha ao criar mensagem inicial E2E: ${messageError.message}`);
	}

	return {
		...productFixture,
		buyer,
		negotiationId: negotiation.id,
		startDate,
		endDate,
		message
	};
}
