<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import NegotiationPropose from '$lib/components/NegotiationPropose.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import AppRating from '$lib/components/ui/AppRating.svelte';
	import AppAccordion from '$lib/components/ui/AppAccordion.svelte';
	import ReviewList from '$lib/components/ReviewList.svelte';
	import { supabase } from '$lib/supabase';
	import { listingPriceLabel, MACHINE_OFFER_LABEL } from '$lib/pricing';
	import { ChevronRight, CircleAlert, CircleUser, Handshake, ImageOff, Images, LogIn } from 'lucide-svelte';

	const TYPE_LABEL = { maquinario: 'Máquina', produto: 'Produto', servico: 'Serviço' };

	function resolveDisplayName(profile, authUser) {
		return (
			profile?.display_name ||
			authUser?.user_metadata?.full_name ||
			authUser?.user_metadata?.name ||
			authUser?.email?.split('@')[0] ||
			'Usuário'
		);
	}

	function resolveAvatarUrl(profile, authUser) {
		return (
			profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			authUser?.user_metadata?.avatar_url ||
			null
		);
	}

	function resolveInitials(name) {
		return (
			name
				.split(' ')
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase())
				.join('') || 'U'
		);
	}

	function mapReviewRow(row, productNamesById = {}) {
		const reviewer = row.reviewer ?? row.profiles ?? null;
		const productId = row.booking_product_id ?? null;
		const productName =
			row.product_name ||
			(productId && productNamesById[String(productId)]) ||
			null;

		const reviewerName = resolveDisplayName(reviewer, null);
		const reviewerPhoto = resolveAvatarUrl(reviewer, null);

		return {
			id: row.id,
			rating: Number(row.rating) || 0,
			comment: row.comment || '',
			createdAt: row.created_at,
			reviewerName,
			reviewerPhoto,
			reviewerInitials: resolveInitials(reviewerName),
			productName: productName ? String(productName) : null
		};
	}

	async function enrichReviewRows(rows) {
		const list = rows ?? [];
		if (!list.length) return [];

		const reviewerIds = [...new Set(list.map((row) => row.reviewer_id).filter(Boolean))];
		const bookingIds = [...new Set(list.map((row) => row.booking_id).filter(Boolean))];

		let profilesById = {};
		if (reviewerIds.length) {
			const { data: profiles } = await supabase
				.from('profiles')
				.select('id, display_name, photo_url')
				.in('id', reviewerIds);

			profilesById = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile]));
		}

		let productNamesById = {};
		let productIdByBookingId = {};
		if (bookingIds.length) {
			const { data: bookings } = await supabase
				.from('bookings')
				.select('id, product_id, products(name)')
				.in('id', bookingIds);

			for (const booking of bookings ?? []) {
				const product = Array.isArray(booking.products) ? booking.products[0] : booking.products;
				if (booking.product_id) {
					productIdByBookingId[booking.id] = booking.product_id;
					if (product?.name) {
						productNamesById[String(booking.product_id)] = product.name;
					}
				}
			}
		}

		return list.map((row) =>
			mapReviewRow(
				{
					...row,
					reviewer: profilesById[row.reviewer_id] ?? null,
					booking_product_id: productIdByBookingId[row.booking_id] ?? null
				},
				productNamesById
			)
		);
	}

	async function fetchReviewsForProduct(productId) {
		const { data: bookings, error: bookingsError } = await supabase
			.from('bookings')
			.select('id')
			.eq('product_id', productId);

		if (bookingsError) {
			return { reviews: [], error: bookingsError };
		}

		const bookingIds = (bookings ?? []).map((booking) => booking.id);
		if (!bookingIds.length) {
			return { reviews: [], error: null };
		}

		const { data, error } = await supabase
			.from('reviews')
			.select('id, rating, comment, created_at, booking_id, reviewer_id')
			.in('booking_id', bookingIds)
			.order('created_at', { ascending: false });

		if (error) {
			return { reviews: [], error };
		}

		const reviews = await enrichReviewRows(data);
		return { reviews, error: null };
	}

	async function fetchReviewsForUser(revieweeId) {
		if (!revieweeId) {
			return { reviews: [], error: null };
		}

		const { data, error } = await supabase
			.from('reviews')
			.select('id, rating, comment, created_at, booking_id, reviewer_id')
			.eq('reviewee_id', revieweeId)
			.order('created_at', { ascending: false });

		if (error) {
			return { reviews: [], error };
		}

		const reviews = await enrichReviewRows(data);
		return { reviews, error: null };
	}

	function computeReviewStats(reviews) {
		if (!reviews?.length) {
			return { average: 0, count: 0 };
		}

		const sum = reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0);
		return {
			average: sum / reviews.length,
			count: reviews.length
		};
	}

	let loading = $state(true);
	let errorMessage = $state('');
	let item = $state(null);
	let seller = $state({
		name: 'Anunciante',
		avatarUrl: null
	});
	let showNegotiationModal = $state(false);
	let viewerId = $state(null);
	const isOwnListing = $derived(Boolean(viewerId && seller.id && viewerId === seller.id));

	let viewerChecked = $state(false);

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		viewerId = user?.id ?? null;
		viewerChecked = true;
	});
	let reviews = $state([]);
	let reviewsLoading = $state(false);
	let sellerReviewStats = $state({ average: 0, count: 0 });
	let galleryImages = $state([]);

	const routeTipo = $derived(page.params.tipo);
	const routeId = $derived(page.params.id);

	const productReviewStats = $derived(computeReviewStats(reviews));


	function resolveSellerName(profile) {
		return (
			profile?.display_name ||
			'Anunciante'
		);
	}

	function resolveSellerAvatar(profile) {
		return (
			profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			profile?.profile_image_url ||
			null
		);
	}

	async function loadSeller(ownerId) {
		seller = { name: 'Anunciante', avatarUrl: null, id: ownerId ?? null };
		if (!ownerId) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('id, display_name, photo_url')
			.eq('id', ownerId)
			.maybeSingle();

		if (!error && data) {
			seller = {
				id: ownerId,
				name: resolveSellerName(data),
				avatarUrl: resolveSellerAvatar(data)
			};
		}

		const { reviews: sellerReviews } = await fetchReviewsForUser(ownerId);
		sellerReviewStats = computeReviewStats(sellerReviews);
	}

	async function loadProductReviews(productId) {
		if (!productId) {
			reviews = [];
			return;
		}

		reviewsLoading = true;
		const { reviews: data, error } = await fetchReviewsForProduct(productId);
		reviews = data;

		if (error && error.code !== 'PGRST116') {
			console.error('Erro ao carregar avaliações do anúncio:', error.message);
		}

		reviewsLoading = false;
	}

	async function loadProductGallery(productId, legacyImageUrl = null) {
		const { data, error } = await supabase
			.from('product_images')
			.select('id, product_id, url, is_cover, created_at')
			.eq('product_id', productId)
			.order('is_cover', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Erro ao carregar imagens do produto:', error);
		}

		const urls = (data ?? []).map((row) => row.url).filter(Boolean);

		if (urls.length) {
			galleryImages = urls;
			return;
		}

		galleryImages = legacyImageUrl ? [legacyImageUrl] : [];
	}

	async function loadItemDetails() {
		loading = true;
		errorMessage = '';
		item = null;
		galleryImages = [];
		seller = { name: 'Anunciante', avatarUrl: null, id: null };
		reviews = [];
		sellerReviewStats = { average: 0, count: 0 };

		if (!routeTipo || !routeId) {
			errorMessage = 'Anúncio inválido.';
			loading = false;
			return;
		}

		if (routeTipo === 'produto') {
			const { data, error } = await supabase
				.from('products')
				.select('id, name, price, category, quantity, stock_unit, status, owner_id, created_at, description')
				.eq('id', routeId)
				.maybeSingle();

			if (error || !data) {
				errorMessage = 'Produto não encontrado.';
				loading = false;
				return;
			}

			item = {
				type: 'produto',
				productId: data.id,
				title: data.name,
				priceLabel: listingPriceLabel('produto', data.price),
				description: data.description?.trim() || '',
				details: [
					{ label: 'Categoria', value: data.category || 'Não informado' },
					{ label: 'Quantidade disponível', value: data.quantity != null ? `${data.quantity} ${data.stock_unit || ''}`.trim() : 'Não informado' }
				]
			};

			await Promise.all([
				loadSeller(data.owner_id),
				loadProductReviews(data.id),
				loadProductGallery(data.id)
			]);
		} else if (routeTipo === 'maquinario') {
			const { data, error } = await supabase
				.from('products')
				.select(
					`
					id,
					name,
					price,
					description,
					category,
					status,
					owner_id,
					created_at,
					agricultural_machinery (
						id,
						model,
						serial_number,
						manufacture_year,
						current_horimeter,
						offer_type,
						brands (name),
						machinery_types (name)
					)
				`
				)
				.eq('id', routeId)
				.maybeSingle();

			if (error || !data) {
				errorMessage = 'Maquinário não encontrado.';
				loading = false;
				return;
			}

			const machineryRaw = data.agricultural_machinery;
			const machinery = Array.isArray(machineryRaw) ? machineryRaw[0] : machineryRaw;

			if (!machinery) {
				errorMessage = 'Detalhes do maquinário não encontrados.';
				loading = false;
				return;
			}

			item = {
				type: 'maquinario',
				productId: data.id,
				title: data.name,
				priceLabel: listingPriceLabel('maquinario', data.price, machinery.offer_type),
				description: data.description?.trim() || '',
				details: [
					{ label: 'Negócio', value: MACHINE_OFFER_LABEL[machinery.offer_type] ?? 'Não informado' },
					{ label: 'Tipo', value: machinery.machinery_types?.name || 'Não informado' },
					{ label: 'Marca', value: machinery.brands?.name || 'Não informado' },
					{ label: 'Modelo', value: machinery.model || 'Não informado' },
					{ label: 'Ano', value: machinery.manufacture_year || 'Não informado' },
					{ label: 'Horímetro', value: machinery.current_horimeter != null ? `${Number(machinery.current_horimeter).toLocaleString('pt-BR')} h` : 'Não informado' }
				]
			};

			await Promise.all([
				loadSeller(data.owner_id),
				loadProductReviews(data.id),
				loadProductGallery(data.id)
			]);
		} else if (routeTipo === 'servico') {
			const { data, error } = await supabase
				.from('services')
				.select('id, title, price, description, service_type, pricing_model, location, status, owner_id, created_at, image_url')
				.eq('id', routeId)
				.maybeSingle();

			if (error || !data) {
				errorMessage = 'Serviço não encontrado.';
				loading = false;
				return;
			}

			item = {
				type: 'servico',
				serviceId: data.id,
				title: data.title,
				priceLabel: listingPriceLabel('servico', data.price, data.pricing_model),
				description: data.description?.trim() || '',
				details: [
					{ label: 'Tipo', value: data.service_type || 'Não informado' },
					{ label: 'Local', value: data.location || 'Não informado' }
				]
			};

			galleryImages = data.image_url ? [data.image_url] : [];
			await loadSeller(data.owner_id);
		} else {
			errorMessage = 'Tipo de anúncio não suportado.';
		}

		loading = false;
	}

	$effect(() => {
		void routeTipo;
		void routeId;
		loadItemDetails();
	});
</script>

<svelte:head>
	<title>{item?.title ? `${item.title} — Osiris` : 'Anúncio — Osiris'}</title>
</svelte:head>

<div class="min-h-screen bg-surface-100-900 pb-28">
	<Header title="Anúncio" backHref="/buscar" backUsesHistory />

	<main class="mx-auto w-full max-w-3xl">
		{#if loading}
			<div class="space-y-4 px-4 py-4" role="status" aria-live="polite">
				<span class="sr-only">Carregando anúncio...</span>
				<div class="placeholder aspect-[16/10] w-full animate-pulse rounded-container"></div>
				<div class="placeholder h-8 w-2/3 animate-pulse"></div>
				<div class="placeholder h-6 w-1/3 animate-pulse"></div>
			</div>
		{:else if errorMessage}
			<div class="mx-4 mt-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
				<CircleAlert class="h-5 w-5 shrink-0" />
				{errorMessage}
			</div>
		{:else if item}
			<div class="space-y-4 px-4 pt-3">
				<!-- fotos -->
				<section class="relative overflow-hidden rounded-container bg-surface-50-950 shadow-sm">
					{#if galleryImages.length > 0}
						{#if galleryImages.length === 1}
							<img
								src={galleryImages[0]}
								alt={item.title}
								class="aspect-[16/10] w-full object-cover"
							/>
						{:else}
							<div class="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto">
								{#each galleryImages as imageUrl, index (imageUrl + index)}
									<img
										src={imageUrl}
										alt={`${item.title} — imagem ${index + 1}`}
										class="aspect-[16/10] w-[88%] shrink-0 snap-center object-cover first:rounded-r-container last:rounded-l-container"
									/>
								{/each}
							</div>
							<span class="badge absolute bottom-2 right-2 gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
								<Images class="h-3.5 w-3.5" />
								{galleryImages.length} fotos
							</span>
						{/if}
					{:else}
						<div class="flex aspect-[16/10] flex-col items-center justify-center gap-2 preset-tonal-primary text-sm font-medium">
							<ImageOff class="h-10 w-10" strokeWidth={1.5} />
							Sem foto
						</div>
					{/if}

					{#if TYPE_LABEL[item.type]}
						<span class="badge absolute left-3 top-3 rounded-full preset-filled-primary-500 px-3 py-1 text-xs font-bold shadow-sm">
							{TYPE_LABEL[item.type]}
						</span>
					{/if}
				</section>

				<!-- título, preço e ação principal -->
				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<h1 class="min-w-0 flex-1 preset-typo-headline">{item.title}</h1>
						<FavoriteButton
							productId={item.productId ?? null}
							serviceId={item.serviceId ?? null}
						/>
					</div>

					<p class="mt-3 preset-typo-label">Preço</p>
					<p class="text-3xl font-bold leading-tight text-primary-700-300">{item.priceLabel}</p>

					{#if isOwnListing}
						<div class="mt-4 flex items-center gap-3 rounded-container preset-tonal-primary p-4 text-sm">
							<CircleUser class="h-6 w-6 shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="font-semibold">Este anúncio é seu.</p>
								<a
									href={resolve(page.params.tipo === 'servico' ? '/servicos' : '/inventario')}
									class="anchor mt-1 inline-block font-medium text-primary-700-300"
								>
									<span>Gerenciar meus anúncios</span>
								</a>
							</div>
						</div>
					{:else if viewerChecked && !viewerId}
						<!-- visitante: entra antes de escrever a proposta, para não perder o que digitou -->
						<a
							href={resolve(`/login?redirect=/anuncio/${page.params.tipo}/${page.params.id}`)}
							class="btn btn-lg preset-filled-primary-500 mt-4 w-full"
						>
							<LogIn size={18} />
							<span>Entrar para negociar</span>
						</a>
					{:else}
						<button
							type="button"
							onclick={() => (showNegotiationModal = true)}
							class="btn btn-lg preset-filled-primary-500 mt-4 w-full"
						>
							<Handshake size={18} />
							<span>Negociar</span>
						</button>
					{/if}
				</section>

				{#if item.description}
					<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
						<h2 class="preset-typo-title">Descrição</h2>
						<p class="mt-2 whitespace-pre-line preset-typo-body-1 text-surface-900-100">{item.description}</p>
					</section>
				{/if}

				<AppAccordion title="Mais informações">
					<table class="w-full border-separate border-spacing-0 text-base">
						<caption class="sr-only">Detalhes do anúncio</caption>
						<tbody>
							{#each item.details as detail (detail.label)}
								<tr class="odd:bg-surface-100-900">
									<th
										scope="row"
										class="rounded-l-container px-4 py-3.5 text-left align-middle font-normal text-surface-950-50"
									>
										{detail.label}
									</th>
									<td
										class="rounded-r-container px-4 py-3.5 text-right align-middle font-bold break-words text-surface-950-50"
									>
										{detail.value}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</AppAccordion>

				<a
					href={seller.id ? resolve(`/perfil/${seller.id}`) : '#'}
					class="flex items-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500"
				>
					{#if seller.avatarUrl}
						<img src={seller.avatarUrl} alt={seller.name} class="h-14 w-14 rounded-full object-cover" />
					{:else}
						<div
							class="flex h-14 w-14 items-center justify-center rounded-full preset-tonal-primary text-lg font-bold"
						>
							{seller.name.slice(0, 1).toUpperCase()}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-primary-700-300 preset-typo-label">Anunciante</p>
						<p class="truncate text-lg font-bold text-surface-950-50">{seller.name}</p>
						<AppRating
							value={sellerReviewStats.average}
							count={sellerReviewStats.count}
							size="sm"
						/>
					</div>
					<ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300" />
				</a>

				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm">
					<div class="border-b border-surface-200-800 px-4 py-3">
						<h2 class="preset-typo-title">Avaliações do anúncio</h2>
						<div class="mt-1">
							<AppRating
								value={productReviewStats.average}
								count={productReviewStats.count}
								size="sm"
							/>
						</div>
					</div>
					<div class="p-4">
						<ReviewList
							{reviews}
							loading={reviewsLoading}
							emptyTitle="Este anúncio ainda não tem avaliações"
							emptyDescription="Seja o primeiro a avaliar após uma negociação."
						/>
					</div>
				</section>
			</div>
		{/if}
	</main>

	<NegotiationPropose
		bind:open={showNegotiationModal}
		title={item?.title || 'Anúncio'}
		priceLabel={item?.priceLabel || 'Preço a combinar'}
		sellerName={seller.name}
		type={item?.type || 'produto'}
		providerId={seller.id}
		productId={item?.productId ?? null}
		serviceId={item?.serviceId ?? null}
	/>

	<BottomNav active="" />
</div>
