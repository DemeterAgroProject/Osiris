<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CircleAlert, Heart, Search } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import { supabase } from '$lib/supabase';
	import { userMessage } from '$lib/errors';

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

	function resolveProductTipo(category) {
		return category === 'Maquinário' ? 'maquinario' : 'produto';
	}

	async function enrichFavoriteRow(row) {
		if (row.product_id) {
			const { data: product, error } = await supabase
				.from('products')
				.select('id, name, price, category, stock_unit, agricultural_machinery (offer_type, rental_unit)')
				.eq('id', row.product_id)
				.maybeSingle();

			if (error) {
				console.error('Erro ao carregar produto favorito:', error);
			}

			const imagesByProductId = await fetchProductImagesByProductIds(
				product?.id ? [product.id] : []
			);

			const tipo = resolveProductTipo(product?.category);
			const machineryRaw = product?.agricultural_machinery;
			const machinery = Array.isArray(machineryRaw) ? machineryRaw[0] : machineryRaw;
			return {
				id: row.id,
				adId: row.product_id,
				tipo,
				title: product?.name || 'Anúncio favoritado',
				price: product?.price ?? null,
				pricingModel: machinery?.offer_type ?? null,
				priceUnit: tipo === 'maquinario' ? (machinery?.rental_unit ?? null) : (product?.stock_unit ?? null),
				imageUrl: coverUrlFromMap(imagesByProductId, product?.id),
				publishedAt: row.created_at,
				href: `/anuncio/${tipo}/${row.product_id}`
			};
		}

		if (row.service_id) {
			const { data: service, error } = await supabase
				.from('services')
				.select('id, title, price, pricing_model, image_url')
				.eq('id', row.service_id)
				.maybeSingle();

			if (error) {
				console.error('Erro ao carregar serviço favorito:', error);
			}

			return {
				id: row.id,
				adId: row.service_id,
				tipo: 'servico',
				title: service?.title || 'Serviço favoritado',
				price: service?.price ?? null,
				pricingModel: service?.pricing_model ?? null,
				imageUrl: service?.image_url || null,
				publishedAt: row.created_at,
				href: `/anuncio/servico/${row.service_id}`
			};
		}

		return null;
	}

	let loading = $state(true);
	let errorMessage = $state('');
	let favorites = $state([]);

	async function loadFavorites() {
		loading = true;
		errorMessage = '';
		favorites = [];

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(resolve('/login?redirect=/favoritos'));
			return;
		}

		const { data, error } = await supabase
			.from('favorites')
			.select('id, product_id, service_id, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Erro ao carregar favoritos:', error);
			errorMessage = userMessage(error, 'Não foi possível carregar os favoritos.');
			loading = false;
			return;
		}

		const rows = data ?? [];

		if (rows.length === 0) {
			loading = false;
			return;
		}

		const enriched = await Promise.all(rows.map(enrichFavoriteRow));
		favorites = enriched.filter(Boolean);
		loading = false;
	}

	$effect(() => {
		loadFavorites();
	});
</script>

<svelte:head>
	<title>Favoritos — Osiris</title>
</svelte:head>

<div class="min-h-screen pb-24">
	<Header title="Favoritos" />

	<main class="mx-auto w-full max-w-3xl px-4 py-5">
		<div>
			<h1 class="preset-typo-headline">Favoritos</h1>
			<p class="mt-1 preset-typo-subtitle">Anúncios que você guardou para ver depois.</p>
		</div>

		{#if loading}
			<div class="mt-5">
				<ListingSkeleton variant="grid" count={4} label="Carregando favoritos..." />
			</div>
		{:else if errorMessage}
			<div class="mt-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
				<CircleAlert class="h-5 w-5 shrink-0" />
				{errorMessage}
			</div>
		{:else if favorites.length === 0}
			<div
				class="mt-6 flex flex-col items-center rounded-container border border-dashed border-surface-300-700 bg-surface-50-950 px-4 py-12 text-center"
			>
				<span class="flex h-16 w-16 items-center justify-center rounded-full preset-tonal-error">
					<Heart class="h-8 w-8" />
				</span>
				<p class="mt-3 text-base font-semibold text-surface-950-50">Nenhum anúncio favoritado</p>
				<p class="mt-1 preset-typo-subtitle">
					Toque no coração em um anúncio para guardá-lo aqui.
				</p>
				<a
					href={resolve('/buscar')}
					class="btn preset-filled-primary-500 mt-5"
				>
					<Search size={18} />
					<span>Explorar marketplace</span>
				</a>
			</div>
		{:else}
			<p class="mt-4 text-sm font-medium text-surface-900-100">
				<strong class="text-surface-950-50">{favorites.length}</strong>
				{favorites.length === 1 ? 'anúncio salvo' : 'anúncios salvos'}
			</p>
			<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each favorites as favorite (favorite.id)}
					<ProductCard
						title={favorite.title}
						price={favorite.price}
						pricingModel={favorite.pricingModel}
						priceUnit={favorite.priceUnit}
						imageUrl={favorite.imageUrl}
						publishedAt={favorite.publishedAt}
						tipo={favorite.tipo}
						adId={favorite.adId}
						href={favorite.href}
					/>
				{/each}
			</div>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
