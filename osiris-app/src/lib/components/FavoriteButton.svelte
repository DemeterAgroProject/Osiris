<script>
	import { Heart } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	let { productId = null, serviceId = null, class: className = '' } = $props();

	let loading = $state(true);
	let toggling = $state(false);
	let isFavorited = $state(false);
	let authUserId = $state(null);

	async function checkFavorite() {
		loading = true;

		const {
			data: { user }
		} = await supabase.auth.getUser();

		authUserId = user?.id ?? null;

		if (!user || (!productId && !serviceId)) {
			isFavorited = false;
			loading = false;
			return;
		}

		let query = supabase.from('favorites').select('id').eq('user_id', user.id);

		if (productId) {
			query = query.eq('product_id', productId);
		} else {
			query = query.eq('service_id', serviceId);
		}

		const { data } = await query.limit(1).maybeSingle();
		isFavorited = Boolean(data);
		loading = false;
	}

	async function toggleFavorite(event) {
		event.preventDefault();
		event.stopPropagation();

		if (toggling || loading) return;

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
			return;
		}

		if (!productId && !serviceId) return;

		toggling = true;

		if (isFavorited) {
			let query = supabase.from('favorites').delete().eq('user_id', user.id);

			if (productId) {
				query = query.eq('product_id', productId);
			} else {
				query = query.eq('service_id', serviceId);
			}

			const { error } = await query;

			if (!error) {
				isFavorited = false;
			}
		} else {
			const payload = {
				user_id: user.id,
				product_id: productId || null,
				service_id: serviceId || null
			};

			const { error } = await supabase.from('favorites').insert(payload);

			if (!error) {
				isFavorited = true;
			}
		}

		toggling = false;
	}

	$effect(() => {
		void productId;
		void serviceId;
		checkFavorite();
	});
</script>

<button
	type="button"
	onclick={toggleFavorite}
	disabled={loading || toggling || (!productId && !serviceId)}
	class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-green-300 hover:text-green-700 disabled:opacity-50 {className}"
	aria-label={isFavorited ? 'Remover dos salvos' : 'Salvar anúncio'}
	aria-pressed={isFavorited}
>
	<Heart
		class="h-5 w-5 {isFavorited ? 'fill-red-500 text-red-500' : ''} {toggling ? 'animate-pulse' : ''}"
	/>
</button>
