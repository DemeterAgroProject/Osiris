<script>
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ProductList from '$lib/components/ProductList.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';


	let loading = $state(true);
	let products = $state([]);
	let machinery = $state([]);

	onMount(async () => {
		await loadPublicListings();
	});

	function mapProductItem(item) {
		return {
			id: `product-${item.id}`,
			adId: item.id,
			tipo: 'produto',
			title: item.name,
			price: item.price,
			location: 'Alegrete, RS',
			views: '-',
			publishedAt: item.created_at,
			imageUrl: null,
			sponsored: false,
			href: `/anuncio/produto/${item.id}`
		};
	}

	function mapMachineryItem(item) {
		return {
			id: `machinery-${item.id}`,
			adId: item.id,
			tipo: 'maquinario',
			title: item.name,
			price: item.hourly_rate,
			location: 'Alegrete, RS',
			views: '-',
			publishedAt: item.created_at,
			imageUrl: null,
			sponsored: false,
			href: `/anuncio/maquinario/${item.id}`
		};
	}

	async function loadPublicListings() {
		loading = true;

		const [productsResponse, machineryResponse] = await Promise.all([
			supabase
				.from('products')
				.select('id, name, price, status, created_at')
				.eq('status', 'Ativo')
				.order('created_at', { ascending: false })
				.limit(20),
			supabase
				.from('agricultural_machinery')
				.select('id, name, hourly_rate, status, created_at')
				.eq('status', 'Ativo')
				.order('created_at', { ascending: false })
				.limit(20)
		]);

		products = productsResponse.data ? productsResponse.data.map(mapProductItem) : [];
		machinery = machineryResponse.data ? machineryResponse.data.map(mapMachineryItem) : [];

		loading = false;
	}

	const mergedResults = $derived(
		[...products, ...machinery]
			.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
			.slice(0, 20)
	);
</script>

<Header />
<SearchBar />
<FilterBar />
{#if loading}
	<div class="px-4 py-10 text-center text-sm text-gray-500">Carregando anúncios...</div>
{:else}
	<ProductList title="Resultados da busca" products={mergedResults} />
{/if}
<BottomNav />
