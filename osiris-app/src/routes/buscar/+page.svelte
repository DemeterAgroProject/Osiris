<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ProductList from '$lib/components/ProductList.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';

	const ACTIVE_STATUS_OR = 'status.eq.ativo,status.eq.Ativo';
	const DEFAULT_LOCATION = 'Alegrete, RS';
	const FETCH_LIMIT = 60;
	const DEBOUNCE_MS = 350;

	function pickCoverImage(images = []) {
		if (!images?.length) return null;
		const cover = images.find((img) => img.is_cover && img.url?.trim());
		return cover?.url?.trim() ?? images.find((img) => img.url?.trim())?.url?.trim() ?? null;
	}

	function resolveProductImageUrl(images = [], legacyImageUrl = null) {
		const fromGallery = pickCoverImage(images);
		if (fromGallery) return fromGallery;
		const legacy = legacyImageUrl?.trim?.() ?? legacyImageUrl;
		return legacy || null;
	}

	function coverUrlFromMap(imagesByProductId, productId, legacyImageUrl = null) {
		const images = imagesByProductId.get(productId) ?? [];
		return resolveProductImageUrl(images, legacyImageUrl);
	}

	async function fetchProductImagesByProductIds(productIds) {
		const map = new Map();
		if (!productIds?.length) return map;

		const uniqueIds = [...new Set(productIds.filter(Boolean))];
		const { data, error } = await supabase
			.from('product_images')
			.select('id, product_id, url, is_cover, created_at')
			.in('product_id', uniqueIds)
			.order('is_cover', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Erro ao carregar product_images:', error);
			return map;
		}

		for (const row of data ?? []) {
			if (!map.has(row.product_id)) map.set(row.product_id, []);
			map.get(row.product_id).push(row);
		}

		return map;
	}

	function createDefaultFilters() {
		return {
			listingTypes: [],
			productKinds: [],
			serviceKinds: [],
			laborKinds: [],
			status: '',
			location: '',
			sort: 'recentes',
			minPrice: '',
			maxPrice: ''
		};
	}

	function filtersFromSearchParams(searchParams) {
		const base = createDefaultFilters();
		const tipo = searchParams.get('tipo');

		if (tipo === 'maquinario') {
			return { ...base, listingTypes: ['maquinario'], productKinds: ['maquinas'] };
		}
		if (tipo === 'produto') {
			return { ...base, listingTypes: ['produto'], productKinds: ['insumos'] };
		}
		if (tipo === 'servico') {
			return { ...base, listingTypes: ['servico', 'mao-de-obra'] };
		}

		return base;
	}

	let searchQuery = $state('');
	let debouncedSearch = $state('');
	let filters = $state(createDefaultFilters());

	let loading = $state(true);
	let fetching = $state(false);
	let errorMessage = $state('');
	let products = $state([]);
	let machinery = $state([]);
	let services = $state([]);

	let loadSeq = 0;
	let debounceTimer;
	let skipDebouncedFetch = $state(true);

	function normalizeText(value) {
		return (value ?? '').toString().trim().toLowerCase();
	}

	function escapeIlike(term) {
		return term.replace(/[%_,.()]/g, ' ').trim();
	}

	function activeFilterCount(filterState) {
		let count = 0;
		if (filterState.listingTypes.length) count++;
		if (filterState.productKinds.length) count++;
		if (filterState.serviceKinds.length) count++;
		if (filterState.laborKinds.length) count++;
		if (filterState.location) count++;
		if (filterState.minPrice || filterState.maxPrice) count++;
		return count;
	}

	function mapProductListing(product, imagesByProductId) {
		return {
			id: `product-${product.id}`,
			adId: product.id,
			tipo: 'produto',
			title: product.name,
			price: product.price,
			location: DEFAULT_LOCATION,
			views: '-',
			publishedAt: product.created_at,
			imageUrl: coverUrlFromMap(imagesByProductId, product.id),
			sponsored: false,
			category: product.category,
			description: product.description ?? '',
			href: `/anuncio/produto/${product.id}`
		};
	}

	function mapMachineryListing(product, imagesByProductId) {
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
			imageUrl: coverUrlFromMap(imagesByProductId, product.id),
			sponsored: false,
			category: product.category || 'Maquinário',
			description: product.description ?? '',
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
			serviceType: service.service_type,
			description: service.description ?? '',
			href: `/anuncio/servico/${service.id}`
		};
	}

	function mergeListingGroups(groups) {
		return [...(groups.products ?? []), ...(groups.machinery ?? []), ...(groups.services ?? [])];
	}

	function sortListings(listings, sortId) {
		const items = [...listings];
		switch (sortId) {
			case 'preco-asc':
				return items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
			case 'preco-desc':
				return items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
			case 'nome-asc':
				return items.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
			case 'nome-desc':
				return items.sort((a, b) => b.title.localeCompare(a.title, 'pt-BR'));
			default:
				return items.sort(
					(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
				);
		}
	}

	function matchesListingTypes(item, types) {
		if (!types.length) return true;
		if (item.tipo === 'produto' && types.includes('produto')) return true;
		if (item.tipo === 'maquinario' && types.includes('maquinario')) return true;
		if (item.tipo === 'servico') {
			if (types.includes('servico') && item.serviceType === 'Pacote Completo') return true;
			if (types.includes('mao-de-obra') && item.serviceType === 'Mão de Obra') return true;
		}
		return false;
	}

	function applyLocalFilters(listings, filterState, searchTerm) {
		let result = listings;
		const q = normalizeText(searchTerm);

		if (q) {
			result = result.filter((item) => {
				const haystack = [item.title, item.subtitle, item.category, item.location, item.description]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				return haystack.includes(q);
			});
		}

		if (filterState.listingTypes.length) {
			result = result.filter((item) => matchesListingTypes(item, filterState.listingTypes));
		}

		if (filterState.productKinds.length) {
			result = result.filter((item) => {
				if (filterState.productKinds.includes('insumos') && item.tipo === 'produto') return true;
				if (filterState.productKinds.includes('maquinas') && item.tipo === 'maquinario') return true;
				return false;
			});
		}

		if (filterState.serviceKinds.length) {
			result = result.filter(
				(item) => item.tipo === 'servico' && item.serviceType === 'Pacote Completo'
			);
		}

		if (filterState.laborKinds.length) {
			result = result.filter(
				(item) => item.tipo === 'servico' && item.serviceType === 'Mão de Obra'
			);
		}

		if (filterState.location) {
			const loc = normalizeText(filterState.location);
			result = result.filter((item) => normalizeText(item.location).includes(loc));
		}

		const minPrice = Number(filterState.minPrice);
		const maxPrice = Number(filterState.maxPrice);
		if (Number.isFinite(minPrice) && minPrice > 0) {
			result = result.filter((item) => Number(item.price) >= minPrice);
		}
		if (Number.isFinite(maxPrice) && maxPrice > 0) {
			result = result.filter((item) => Number(item.price) <= maxPrice);
		}

		return sortListings(result, filterState.sort);
	}

	async function loadMarketplaceListings(searchTerm = '') {
		const seq = ++loadSeq;
		const term = escapeIlike(normalizeText(searchTerm));
		const useServerSearch = term.length >= 2;

		if (!loading) fetching = true;
		errorMessage = '';

		let productQuery = supabase
			.from('products')
			.select('id, name, price, status, created_at, category, description')
			.or(ACTIVE_STATUS_OR)
			.neq('category', 'Maquinário')
			.order('created_at', { ascending: false })
			.limit(FETCH_LIMIT);

		let machineryQuery = supabase
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
			.limit(FETCH_LIMIT);

		let serviceQuery = supabase
			.from('services')
			.select(
				'id, title, price, status, location, created_at, service_type, pricing_model, description'
			)
			.or(ACTIVE_STATUS_OR)
			.order('created_at', { ascending: false })
			.limit(FETCH_LIMIT);

		if (useServerSearch) {
			const pattern = `%${term}%`;
			productQuery = productQuery.ilike('name', pattern);
			machineryQuery = machineryQuery.ilike('name', pattern);
			serviceQuery = serviceQuery.ilike('title', pattern);
		}

		const [productsResult, machineryResult, servicesResult] = await Promise.all([
			productQuery,
			machineryQuery,
			serviceQuery
		]);

		if (seq !== loadSeq) return;

		const error = productsResult.error || machineryResult.error || servicesResult.error;

		if (error) {
			errorMessage = 'Não foi possível carregar os anúncios.';
			products = [];
			machinery = [];
			services = [];
		} else {
			const productRows = productsResult.data ?? [];
			const machineryRows = machineryResult.data ?? [];
			const imagesByProductId = await fetchProductImagesByProductIds([
				...productRows.map((row) => row.id),
				...machineryRows.map((row) => row.id)
			]);

			products = productRows.map((row) => mapProductListing(row, imagesByProductId));
			machinery = machineryRows.map((row) => mapMachineryListing(row, imagesByProductId));
			services = (servicesResult.data ?? []).map(mapServiceListing);
		}

		loading = false;
		fetching = false;
	}

	const catalog = $derived(mergeListingGroups({ products, machinery, services }));

	const visibleListings = $derived(applyLocalFilters(catalog, filters, searchQuery));

	const locationOptions = $derived([...new Set(catalog.map((item) => item.location).filter(Boolean))]);

	$effect(() => {
		const term = searchQuery;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedSearch = term;
		}, DEBOUNCE_MS);
		return () => clearTimeout(debounceTimer);
	});

	$effect(() => {
		if (skipDebouncedFetch) return;
		loadMarketplaceListings(debouncedSearch);
	});

	onMount(async () => {
		const q = page.url.searchParams.get('q');
		if (q) searchQuery = q;

		filters = filtersFromSearchParams(page.url.searchParams);

		await loadMarketplaceListings(searchQuery);
		skipDebouncedFetch = false;
	});
</script>

<svelte:head>
	<title>Buscar — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />
	<SearchBar bind:value={searchQuery} loading={fetching} placeholder="Buscar no marketplace..." />
	<FilterBar bind:filters locations={locationOptions} resultCount={visibleListings.length} />

	{#if loading}
		<div class="px-4 py-10 text-center text-sm text-gray-500">Carregando anúncios...</div>
	{:else if errorMessage}
		<div class="mx-4 my-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
	{:else if visibleListings.length === 0}
		<div class="mx-4 my-8 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
			<p class="text-sm font-semibold text-gray-800">Nenhum anúncio encontrado</p>
			<p class="mt-1 text-xs text-gray-500">Tente outros termos ou limpe os filtros.</p>
		</div>
	{:else}
		<ProductList title="Resultados da busca" products={visibleListings} />
	{/if}

	<BottomNav active="buscar" />
</div>
