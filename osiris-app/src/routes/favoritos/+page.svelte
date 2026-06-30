<script>
	import { goto } from '$app/navigation';
	import { Heart } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import { supabase } from '$lib/supabase';
	import { ChevronLeft } from 'lucide-svelte';

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

	function resolveProductTipo(category) {
		return category === 'Maquinário' ? 'maquinario' : 'produto';
	}

	async function enrichFavoriteRow(row) {
		if (row.product_id) {
			const { data: product, error } = await supabase
				.from('products')
				.select('id, name, price, category')
				.eq('id', row.product_id)
				.maybeSingle();

			if (error) {
				console.error('Erro ao carregar produto favorito:', error);
			}

			const imagesByProductId = await fetchProductImagesByProductIds(
				product?.id ? [product.id] : []
			);

			const tipo = resolveProductTipo(product?.category);
			return {
				id: row.id,
				adId: row.product_id,
				tipo,
				title: product?.name || 'Anúncio favoritado',
				price: product?.price ?? null,
				imageUrl: coverUrlFromMap(imagesByProductId, product?.id),
				publishedAt: row.created_at,
				href: `/anuncio/${tipo}/${row.product_id}`
			};
		}

		if (row.service_id) {
			const { data: service, error } = await supabase
				.from('services')
				.select('id, title, price')
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
				imageUrl: null,
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
			await goto('/login?redirect=/favoritos');
			return;
		}

		const { data, error } = await supabase
			.from('favorites')
			.select('id, product_id, service_id, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Erro ao carregar favoritos:', error);
			errorMessage = error.message || 'Não foi possível carregar os favoritos.';
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

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-6">

		
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Favoritos</h1>
			<p class="mt-1 text-sm text-gray-500">Anúncios que você favoritou no marketplace.</p>
		</div>
		
		<a
			href="/buscar"
			class="mx-4 mt-4 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600"
		>
			<ChevronLeft class="h-4 w-4" />
			Voltar
		</a>
		
		{#if loading}
			<div class="flex justify-center py-16">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
				></div>
			</div>
		{:else if errorMessage}
			<div class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if favorites.length === 0}
			<div
				class="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center"
			>
				<Heart class="mx-auto h-10 w-10 text-gray-300" />
				<p class="mt-3 text-sm font-semibold text-gray-800">Nenhum anúncio favoritado</p>
				<p class="mt-1 text-xs text-gray-500">
					Toque no coração em um anúncio para favoritá-lo e guardá-lo aqui.
				</p>
				<a
					href="/buscar"
					class="mt-5 inline-flex rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
				>
					Explorar marketplace
				</a>
			</div>
		{:else}
			<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
				{#each favorites as favorite (favorite.id)}
					<ProductCard
						title={favorite.title}
						price={favorite.price}
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
