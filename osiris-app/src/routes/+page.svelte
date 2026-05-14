<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ProductList from '$lib/components/ProductList.svelte';
	import CategorySection from '$lib/components/CategorySection.svelte';
	import PartnerSection from '$lib/components/PartnerSection.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';

	let loading = $state(true);
	let errorMessage = $state('');
	let products = $state([]);
	let machinery = $state([]);

	onMount(async () => {
		await loadHomeListings();
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

	async function loadHomeListings() {
		loading = true;
		errorMessage = '';

		const [productsResponse, machineryResponse] = await Promise.all([
			supabase
				.from('products')
				.select('id, name, price, status, created_at')
				.eq('status', 'Ativo')
				.order('created_at', { ascending: false })
				.limit(12),
			supabase
				.from('agricultural_machinery')
				.select('id, name, hourly_rate, status, created_at')
				.eq('status', 'Ativo')
				.order('created_at', { ascending: false })
				.limit(12)
		]);

		if (productsResponse.error || machineryResponse.error) {
			errorMessage = 'Não foi possível carregar os anúncios no momento.';
			products = [];
			machinery = [];
			loading = false;
			return;
		}

		products = productsResponse.data ? productsResponse.data.map(mapProductItem) : [];
		machinery = machineryResponse.data ? machineryResponse.data.map(mapMachineryItem) : [];
		loading = false;
	}

	const allListings = $derived(
		[...products, ...machinery]
			.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
	);

	const featuredListings = $derived(allListings.slice(0, 8));
	const sponsoredListings = $derived(allListings.slice(0, 4).map((item) => ({ ...item, sponsored: true })));
	const machineryHighlights = $derived(machinery.slice(0, 6));
	const productHighlights = $derived(products.slice(0, 6));
</script>

<svelte:head>
	<title>Osiris - Marketplace Agro</title>
	<meta
		name="description"
		content="Encontre máquinas agrícolas, produtos e serviços no marketplace Osiris."
	/>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />
	<SearchBar />
	<FilterBar />

	<div class="px-4 pb-2 pt-1">
		<div class="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 p-4 text-white shadow-sm">
			<p class="text-xs font-medium uppercase tracking-wider text-green-100">Marketplace Osiris</p>
			<h1 class="mt-1 text-xl font-bold">Máquinas, produtos e serviços em um só lugar</h1>
			<p class="mt-1 text-sm text-green-100">Descubra oportunidades novas todos os dias.</p>
		</div>
	</div>

	{#if loading}
		<div class="px-4 py-10 text-center text-sm text-gray-500">Carregando destaques...</div>
	{:else if errorMessage}
		<div class="mx-4 my-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
	{:else}
		<ProductList title="Em destaque" products={featuredListings} />
		<ProductList title="Patrocinados" products={sponsoredListings} />
		<ProductList title="Máquinas em alta" products={machineryHighlights} />
		<ProductList title="Produtos em alta" products={productHighlights} />
		<CategorySection />
		<PartnerSection />
	{/if}

	<BottomNav active="inicio" />
</div>
