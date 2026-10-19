<script>
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import ProductSection from '$lib/components/ProductSection.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import CategorySection from '$lib/components/CategorySection.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { resolve } from '$app/paths';
	import { ArrowRight, Briefcase, CircleAlert, Leaf, Search, SearchX, Sprout, Tractor } from 'lucide-svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	const HERO_SHORTCUTS = [
		{ tipo: 'maquinario', label: 'Máquinas', icon: Tractor },
		{ tipo: 'produto', label: 'Insumos e sementes', icon: Leaf },
		{ tipo: 'servico', label: 'Serviços', icon: Briefcase }
	];
	import { supabase } from '$lib/supabase';
	import { formatMunicipio, MUNICIPIO_EMBED, pickMunicipio } from '$lib/municipios';

	const ACTIVE_STATUS_OR = 'status.eq.ativo,status.eq.Ativo';
	const HOME_CAROUSEL_LIMIT = 6;
	const HOME_FETCH_LIMIT = 6;
	const SEARCH_FETCH_LIMIT = 48;
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
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- mapa local, não é estado
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

	let searchQuery = $state('');
	let debouncedSearch = $state('');
	let filters = $state(createDefaultFilters());

	let loading = $state(true);
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
			priceUnit: product.stock_unit ?? null,
			location: formatMunicipio(pickMunicipio(product.municipio)) || null,
			publishedAt: product.created_at,
			imageUrl: coverUrlFromMap(imagesByProductId, product.id),
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
			pricingModel: m?.offer_type ?? null,
			priceUnit: m?.rental_unit ?? null,
			location: formatMunicipio(pickMunicipio(product.municipio)) || null,
			publishedAt: product.created_at,
			imageUrl: coverUrlFromMap(imagesByProductId, product.id),
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
			pricingModel: service.pricing_model,
			// o card mostra a cidade-base; serviços antigos só têm a área de atendimento em texto
			location: formatMunicipio(pickMunicipio(service.municipio)) || service.location || null,
			publishedAt: service.created_at,
			imageUrl: service.image_url || null,
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

	function buildBuscarHref({ tipo = null } = {}) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- usado só para montar a URL
		const params = new URLSearchParams();
		const q = searchQuery.trim();
		if (q) params.set('q', q);
		if (tipo) params.set('tipo', tipo);
		const qs = params.toString();
		return qs ? `/buscar?${qs}` : '/buscar';
	}

	function resolveFetchLimit(searchTerm) {
		const hasSearch = normalizeText(searchTerm).length >= 2;
		const hasFilters = activeFilterCount(filters) > 0;
		return hasSearch || hasFilters ? SEARCH_FETCH_LIMIT : HOME_FETCH_LIMIT;
	}

	async function loadMarketplaceListings(searchTerm = '') {
		const seq = ++loadSeq;
		const term = escapeIlike(normalizeText(searchTerm));
		const useServerSearch = term.length >= 2;
		const fetchLimit = resolveFetchLimit(searchTerm);

		errorMessage = '';

		let productQuery = supabase
			.from('products')
			.select(`id, name, price, status, created_at, category, description, stock_unit, municipio:municipios(${MUNICIPIO_EMBED})`)
			.or(ACTIVE_STATUS_OR)
			.neq('category', 'Maquinário')
			.order('created_at', { ascending: false })
			.limit(fetchLimit);

		let machineryQuery = supabase
			.from('products')
			.select(
				`
				id, name, price, status, created_at, category, description,
				municipio:municipios(${MUNICIPIO_EMBED}),
				agricultural_machinery!inner (
					id, model, manufacture_year, current_horimeter, offer_type, rental_unit,
					brands (name), machinery_types (name)
				)
			`
			)
			.or(ACTIVE_STATUS_OR)
			.order('created_at', { ascending: false })
			.limit(fetchLimit);

		let serviceQuery = supabase
			.from('services')
			.select(
				`id, title, price, status, location, created_at, service_type, pricing_model, description, image_url, municipio:municipios(${MUNICIPIO_EMBED})`
			)
			.or(ACTIVE_STATUS_OR)
			.order('created_at', { ascending: false })
			.limit(fetchLimit);

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
			errorMessage = 'Não foi possível carregar os anúncios no momento.';
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
	}

	const catalog = $derived(mergeListingGroups({ products, machinery, services }));

	const visibleListings = $derived(applyLocalFilters(catalog, filters, searchQuery));

	const hasDiscoveryMode = $derived(
		normalizeText(searchQuery).length > 0 || activeFilterCount(filters) > 0
	);

	const homePreviewListings = $derived(visibleListings.slice(0, HOME_CAROUSEL_LIMIT));

	const featuredListings = $derived(
		sortListings(catalog, 'recentes').slice(0, HOME_CAROUSEL_LIMIT)
	);

	const machineryHighlights = $derived(
		hasDiscoveryMode
			? visibleListings.filter((i) => i.tipo === 'maquinario').slice(0, HOME_CAROUSEL_LIMIT)
			: machinery.slice(0, HOME_CAROUSEL_LIMIT)
	);

	const productHighlights = $derived(
		hasDiscoveryMode
			? visibleListings.filter((i) => i.tipo === 'produto').slice(0, HOME_CAROUSEL_LIMIT)
			: products.slice(0, HOME_CAROUSEL_LIMIT)
	);

	const serviceHighlights = $derived(
		hasDiscoveryMode
			? visibleListings.filter((i) => i.tipo === 'servico').slice(0, HOME_CAROUSEL_LIMIT)
			: services.slice(0, HOME_CAROUSEL_LIMIT)
	);

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
		await loadMarketplaceListings('');
		skipDebouncedFetch = false;
	});
</script>

<svelte:head>
	<title>Osiris - Marketplace Agro</title>
	<meta
		name="description"
		content="Encontre máquinas agrícolas, produtos e serviços no marketplace Osiris."
	/>
</svelte:head>

<div class="min-h-screen w-full pb-24 lg:pb-0">
	<Header title="Início" />

	{#if !hasDiscoveryMode}
		<div class="mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
			<div class="relative overflow-hidden rounded-container bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-primary-50 shadow-md lg:p-10">
				<Sprout class="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 opacity-10 lg:h-72 lg:w-72" aria-hidden="true" />
				<span class="badge rounded-full bg-white/15 px-2.5 py-1 uppercase text-xs font-bold tracking-wide">Marketplace Osiris</span>
				<h1 class="mt-3 preset-typo-headline lg:text-4xl">Máquinas, produtos e serviços em um só lugar</h1>
				<p class="mt-2 text-sm opacity-90 sm:text-base lg:max-w-2xl lg:text-lg">Descubra oportunidades novas todos os dias.</p>
				<a
					href={resolve('/buscar')}
					class="btn btn-md preset-filled-surface-50-950 mt-4 lg:hidden"
				>
					<span>Ver todos os anúncios</span>
					<ArrowRight size={18} />
				</a>

				<!-- computador: busca direto do destaque (abre /buscar?q=...) e atalhos por tipo -->
				<form
					action={resolve('/buscar')}
					method="get"
					role="search"
					class="relative mt-6 hidden max-w-3xl items-center gap-2 rounded-container bg-surface-50-950 p-2 shadow-lg lg:flex"
				>
					<Search size={20} class="ml-2 shrink-0 text-primary-700-300" aria-hidden="true" />
					<label for="hero-search" class="sr-only">O que você procura?</label>
					<input
						id="hero-search"
						name="q"
						type="search"
						autocomplete="off"
						placeholder="O que você procura? Ex: trator, sementes de soja, tratorista"
						class="input h-12 min-w-0 flex-1 border-0 bg-transparent text-base text-surface-950-50 focus:ring-0"
					/>
					<button type="submit" class="btn btn-lg preset-filled-primary-500 shrink-0">
						<span>Buscar</span>
						<ArrowRight size={18} />
					</button>
				</form>
				<div class="mt-4 hidden flex-wrap items-center gap-2 lg:flex">
					<span class="preset-typo-label text-inherit opacity-90">Atalhos:</span>
					{#each HERO_SHORTCUTS as shortcut (shortcut.tipo)}
						<a href={resolve(`/buscar?tipo=${shortcut.tipo}`)} class="btn btn-sm rounded-full bg-white/15 text-white hover:bg-white/25">
							<shortcut.icon size={16} />
							<span>{shortcut.label}</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if loading}
		<ListingSkeleton variant="carousel" count={3} sections={3} label="Carregando destaques..." />
	{:else if errorMessage}
		<div class="mx-4 my-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
			<CircleAlert class="h-5 w-5 shrink-0" />
			{errorMessage}
		</div>
	{:else if hasDiscoveryMode}
		{#if visibleListings.length === 0}
			<div
				class="mx-4 my-8 flex flex-col items-center rounded-container border border-dashed border-surface-300-700 bg-surface-50-950 px-4 py-12 text-center"
			>
				<SearchX class="h-10 w-10 text-surface-700-300" />
				<p class="mt-3 text-base font-semibold">Nenhum anúncio encontrado</p>
				<p class="mt-1 text-sm text-surface-900-100">
					Tente outra palavra ou limpe a busca.
				</p>
			</div>
		{:else}
			<ProductSection
				title="Resultados"
				products={homePreviewListings}
				limit={HOME_CAROUSEL_LIMIT}
				seeMoreHref={buildBuscarHref()}
				seeMoreLabel="Ver todos na busca"
			/>
		{/if}
	{:else}
		<ProductSection
			title="Novidades"
			products={featuredListings}
			limit={HOME_CAROUSEL_LIMIT}
			seeMoreHref="/buscar"
		/>
		<CategorySection />
		<ProductSection
			title="Máquinas"
			subtitle="Tratores, colheitadeiras e implementos"
			products={machineryHighlights}
			limit={HOME_CAROUSEL_LIMIT}
			seeMoreHref={buildBuscarHref({ tipo: 'maquinario' })}
		/>
		<ProductSection
			title="Produtos e insumos"
			subtitle="Sementes, fertilizantes e defensivos"
			products={productHighlights}
			limit={HOME_CAROUSEL_LIMIT}
			seeMoreHref={buildBuscarHref({ tipo: 'produto' })}
		/>
		<ProductSection
			title="Serviços"
			subtitle="Mão de obra e serviços no campo"
			products={serviceHighlights}
			limit={HOME_CAROUSEL_LIMIT}
			seeMoreHref={buildBuscarHref({ tipo: 'servico' })}
		/>
	{/if}

	<SiteFooter />
	<BottomNav active="inicio" />
</div>
