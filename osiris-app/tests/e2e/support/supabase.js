import { createClient } from '@supabase/supabase-js';
import { E2E_USERS, loadE2eEnv } from './env.js';

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function toDateOnly(date) {
	return date.toISOString().slice(0, 10);
}

export async function signedSupabaseClient(role) {
	const env = loadE2eEnv();
	const user = E2E_USERS[role];

	if (!user) {
		throw new Error(`Usuario E2E desconhecido: ${role}`);
	}

	const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	const { error } = await supabase.auth.signInWithPassword({
		email: user.email,
		password: env.e2ePassword
	});

	if (error) {
		throw new Error(`Falha ao autenticar ${user.email}: ${error.message}`);
	}

	return supabase;
}

function resolveRpcUuid(data) {
	if (!data) return null;
	if (typeof data === 'string') return data;
	if (typeof data === 'object' && data.id) return data.id;
	return String(data);
}

export async function createAcceptedProductBookingFixture(testInfo) {
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
