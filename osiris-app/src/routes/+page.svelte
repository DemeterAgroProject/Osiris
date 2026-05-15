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

	const ACTIVE_STATUS_OR = 'status.eq.ativo,status.eq.Ativo';
	const DEFAULT_LOCATION = 'Alegrete, RS';

	let loading = $state(true);
	let errorMessage = $state('');
	let products = $state([]);
	let machinery = $state([]);
	let services = $state([]);

	function mapProductListing(product) {
		return {
			id: `product-${product.id}`,
			adId: product.id,
			tipo: 'produto',
			title: product.name,
			price: product.price,
			location: DEFAULT_LOCATION,
			views: '-',
			publishedAt: product.created_at,
			imageUrl: null,
			sponsored: false,
			category: product.category,
			href: `/anuncio/produto/${product.id}`
		};
	}

	function mapMachineryListing(product) {
		const machineryRaw = product.agricultural_machinery;
		const m = Array.isArray(machineryRaw) ? machineryRaw[0] : machineryRaw;
		const brandName = m?.brands?.name;
		const typeName = m?.machinery_types?.name;

		return {
			id: `machinery-${product.id}`,
			adId: product.id,
			tipo: 'maquinario',
			title: product.name,
			price: product.price,
			location: DEFAULT_LOCATION,
			views: '-',
			publishedAt: product.created_at,
			imageUrl: null,
			sponsored: false,
			category: product.category || 'Maquinário',
			subtitle: [brandName, m?.model, typeName].filter(Boolean).join(' · ') || null,
			href: `/anuncio/maquinario/${product.id}`
		};
	}

	function mapServiceListing(service) {
		return {
			id: `service-${service.id}`,
			adId: service.id,
			tipo: 'servico',
			title: service.title,
			price: service.price,
			location: service.location || DEFAULT_LOCATION,
			views: '-',
			publishedAt: service.created_at,
			imageUrl: null,
			sponsored: false,
			category: service.service_type,
			href: `/anuncio/servico/${service.id}`
		};
	}

	function mergeListingGroups(groups) {
		return [...(groups.products ?? []), ...(groups.machinery ?? []), ...(groups.services ?? [])].sort(
			(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
		);
	}

	async function fetchProductListings(limit) {
		const { data, error } = await supabase
			.from('products')
			.select('id, name, price, status, created_at, category, description')
			.or(ACTIVE_STATUS_OR)
			.neq('category', 'Maquinário')
			.order('created_at', { ascending: false })
			.limit(limit);

		return { items: (data ?? []).map(mapProductListing), error };
	}

	async function fetchMachineryListings(limit) {
		const { data, error } = await supabase
			.from('products')
			.select(
				`
				id, name, price, status, created_at, category, description,
				agricultural_machinery!inner (
					id, model, manufacture_year, current_horimeter,
					brands (name), machinery_types (name)
				)
			`
			)
			.or(ACTIVE_STATUS_OR)
			.order('created_at', { ascending: false })
			.limit(limit);

		return { items: (data ?? []).map(mapMachineryListing), error };
	}

	async function fetchServiceListings(limit) {
		const { data, error } = await supabase
			.from('services')
			.select('id, title, price, status, location, created_at, service_type, pricing_model')
			.or(ACTIVE_STATUS_OR)
			.order('created_at', { ascending: false })
			.limit(limit);

		return { items: (data ?? []).map(mapServiceListing), error };
	}

	async function loadHomeListings() {
		loading = true;
		errorMessage = '';

		const limit = 12;
		const [productsResult, machineryResult, servicesResult] = await Promise.all([
			fetchProductListings(limit),
			fetchMachineryListings(limit),
			fetchServiceListings(limit)
		]);

		const error = productsResult.error || machineryResult.error || servicesResult.error;

		if (error) {
			errorMessage = 'Não foi possível carregar os anúncios no momento.';
			products = [];
			machinery = [];
			services = [];
		} else {
			products = productsResult.items;
			machinery = machineryResult.items;
			services = servicesResult.items;
		}

		loading = false;
	}

	onMount(() => {
		loadHomeListings();
	});

	const allListings = $derived(mergeListingGroups({ products, machinery, services }));

	const featuredListings = $derived(allListings.slice(0, 8));
	const sponsoredListings = $derived(allListings.slice(0, 4).map((item) => ({ ...item, sponsored: true })));
	const machineryHighlights = $derived(machinery.slice(0, 6));
	const productHighlights = $derived(products.slice(0, 6));
	const serviceHighlights = $derived(services.slice(0, 6));
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
		{#if serviceHighlights.length > 0}
			<ProductList title="Serviços em alta" products={serviceHighlights} />
		{/if}
		<CategorySection />
		<PartnerSection />
	{/if}

	<BottomNav active="inicio" />
</div>
