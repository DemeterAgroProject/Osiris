<script>
	import { Heart } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import { track } from '$lib/telemetry';
	import { m } from '$lib/paraglide/messages';

	let { productId = null, serviceId = null, class: className = '' } = $props();

	let loading = $state(true);
	let toggling = $state(false);
	let isFavorited = $state(false);

	async function checkFavorite() {
		loading = true;

		const {
			data: { user }
		} = await supabase.auth.getUser();

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
			await goto(resolve(`/login?redirect=${encodeURIComponent(window.location.pathname)}`));
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
				track('favorito_removido');
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
				track('favorito_adicionado');
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
	class="btn-icon btn-icon-lg shrink-0 {isFavorited ? 'preset-tonal-error' : 'preset-tonal'}  {className}"
	title={isFavorited ? m.busca_remover_salvos() : m.busca_salvar_anuncio()}
	aria-label={isFavorited ? m.busca_remover_salvos() : m.busca_salvar_anuncio()}
	aria-pressed={isFavorited}
>
	<Heart
		size={18}
		class="{isFavorited ? 'fill-current' : ''}  {toggling ? 'animate-pulse' : ''}"
	/>
</button>
