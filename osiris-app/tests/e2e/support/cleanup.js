import { createClient } from '@supabase/supabase-js';
import { loadE2eEnv } from './env.js';

const ENTITY_NAMES = [
	'products',
	'services',
	'negotiations',
	'bookings',
	'authUsers'
];

function createIdSets() {
	return Object.fromEntries(ENTITY_NAMES.map((entity) => [entity, new Set()]));
}

function values(set) {
	return [...set];
}

export function createE2eDataRegistry() {
	const ids = createIdSets();

	function add(entity, id) {
		if (!id) return;
		if (!ids[entity]) {
			throw new Error(`Entidade E2E desconhecida para cleanup: ${entity}`);
		}
		ids[entity].add(id);
	}

	async function cleanup() {
		if (Object.values(ids).every((entityIds) => entityIds.size === 0)) return;

		const env = loadE2eEnv({ requireServiceRole: true });
		const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});
		const bookingIds = values(ids.bookings);
		const negotiationIds = values(ids.negotiations);
		const productIds = values(ids.products);
		const serviceIds = values(ids.services);
		const authUserIds = values(ids.authUsers);
		const relatedIds = [...new Set([...bookingIds, ...negotiationIds])];
		const failures = [];

		async function remove(table, column, targetIds) {
			if (targetIds.length === 0) return;
			const { error } = await admin.from(table).delete().in(column, targetIds);
			if (error) failures.push(`${table}.${column}: ${error.message}`);
		}

		// A ordem respeita as dependencias conhecidas do schema.
		await remove('reviews', 'booking_id', bookingIds);
		await remove('negotiation_messages', 'negotiation_id', negotiationIds);
		await remove('notifications', 'related_id', relatedIds);
		await remove('favorites', 'product_id', productIds);
		await remove('favorites', 'service_id', serviceIds);
		await remove('bookings', 'id', bookingIds);
		await remove('negotiations', 'id', negotiationIds);
		await remove('product_images', 'product_id', productIds);
		await remove('agricultural_machinery', 'product_id', productIds);
		await remove('products', 'id', productIds);
		await remove('services', 'id', serviceIds);

		for (const userId of authUserIds) {
			const { error } = await admin.auth.admin.deleteUser(userId);
			if (error) failures.push(`auth.users.id: ${error.message}`);
		}

		if (failures.length > 0) {
			throw new Error(`Teardown E2E incompleto:\n- ${failures.join('\n- ')}`);
		}
	}

	return { add, cleanup };
}
