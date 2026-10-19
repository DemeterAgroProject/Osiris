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
	import {
		DELIVERY_LABEL,
		listingPriceLabel,
		MACHINE_CONDITION_LABEL,
		MACHINE_OFFER_LABEL,
		RENTAL_UNIT_LABEL,
		stockUnitLabel
	} from '$lib/pricing';
	import { formatMunicipio, MUNICIPIO_EMBED, pickMunicipio } from '$lib/municipios';
	import { ChevronLeft, ChevronRight, CircleAlert, CircleUser, Handshake, Home, ImageOff, Images, LogIn } from 'lucide-svelte';
	import { Carousel } from '@skeletonlabs/skeleton-svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';

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
	// foto mostrada na galeria (volta para a primeira ao trocar de anúncio)
	let galleryPage = $state(0);

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
			galleryPage = 0;
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
				.select(`id, name, price, category, quantity, stock_unit, status, owner_id, created_at, description, brand_name, min_order, delivery, cultivar, harvest, municipio:municipios(${MUNICIPIO_EMBED})`)
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
				priceLabel: listingPriceLabel('produto', data.price, null, data.stock_unit),
				description: data.description?.trim() || '',
				// opcionais só aparecem quando preenchidos
				details: [
					{ label: 'Local', value: formatMunicipio(pickMunicipio(data.municipio)) || 'Não informado' },
					{ label: 'Categoria', value: data.category || 'Não informado' },
					data.brand_name && { label: 'Marca', value: data.brand_name },
					data.cultivar && { label: 'Cultivar', value: data.cultivar },
					data.harvest && { label: 'Safra', value: data.harvest },
					{ label: 'Quantidade disponível', value: data.quantity != null ? `${Number(data.quantity).toLocaleString('pt-BR')} ${stockUnitLabel(data.stock_unit, data.quantity)}`.trim() : 'Não informado' },
					data.min_order && { label: 'Pedido mínimo', value: `${Number(data.min_order).toLocaleString('pt-BR')} ${stockUnitLabel(data.stock_unit, data.min_order)}` },
					data.delivery && { label: 'Entrega', value: DELIVERY_LABEL[data.delivery] }
				].filter(Boolean)
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
					delivery,
					municipio:municipios(${MUNICIPIO_EMBED}),
					created_at,
					agricultural_machinery (
						id,
						model,
						serial_number,
						manufacture_year,
						current_horimeter,
						offer_type,
						rental_unit,
						operator_included,
						condition,
						power_hp,
						traction,
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
				priceLabel: listingPriceLabel('maquinario', data.price, machinery.offer_type, machinery.rental_unit),
				description: data.description?.trim() || '',
				// opcionais só aparecem quando preenchidos
				details: [
					{
						label: 'Negócio',
						value:
							machinery.offer_type === 'aluguel'
								? `Aluguel ${(RENTAL_UNIT_LABEL[machinery.rental_unit] ?? 'por hora').toLowerCase()}`
								: (MACHINE_OFFER_LABEL[machinery.offer_type] ?? 'Não informado')
					},
					machinery.offer_type === 'aluguel' && {
						label: 'Operador',
						value: machinery.operator_included ? 'Incluso no preço' : 'Não incluso'
					},
					machinery.condition && { label: 'Condição', value: MACHINE_CONDITION_LABEL[machinery.condition] },
					{ label: 'Local', value: formatMunicipio(pickMunicipio(data.municipio)) || 'Não informado' },
					{ label: 'Tipo', value: machinery.machinery_types?.name || 'Não informado' },
					{ label: 'Marca', value: machinery.brands?.name || 'Não informado' },
					{ label: 'Modelo', value: machinery.model || 'Não informado' },
					machinery.power_hp && { label: 'Potência', value: `${machinery.power_hp} cv` },
					machinery.traction && { label: 'Tração', value: machinery.traction === 'esteira' ? 'Esteira' : machinery.traction },
					{ label: 'Ano', value: machinery.manufacture_year || 'Não informado' },
					{ label: 'Horímetro', value: machinery.current_horimeter != null ? `${Number(machinery.current_horimeter).toLocaleString('pt-BR')} h` : 'Não informado' },
					data.delivery && { label: 'Entrega', value: DELIVERY_LABEL[data.delivery] }
				].filter(Boolean)
			};

			await Promise.all([
				loadSeller(data.owner_id),
				loadProductReviews(data.id),
				loadProductGallery(data.id)
			]);
		} else if (routeTipo === 'servico') {
			const { data, error } = await supabase
				.from('services')
				.select(`id, title, price, description, service_type, pricing_model, location, status, owner_id, created_at, image_url, equipment, service_radius_km, municipio:municipios(${MUNICIPIO_EMBED})`)
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
					{ label: 'Cidade', value: formatMunicipio(pickMunicipio(data.municipio)) || 'Não informado' },
					{ label: 'Área de atendimento', value: data.location || 'Não informado' },
					data.service_radius_km && { label: 'Atende até', value: `${data.service_radius_km} km da cidade` },
					data.equipment && { label: 'Equipamento incluso', value: data.equipment }
				].filter(Boolean)
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

{#snippet sellerCard(extraClass)}
	<a
		href={seller.id ? resolve(`/perfil/${seller.id}`) : '#'}
		class="flex items-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500 {extraClass}"
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
{/snippet}


<div class="min-h-screen bg-surface-100-900 pb-28 lg:pb-0">
	<Header title="Anúncio" backHref="/buscar" backUsesHistory />

	<main class="mx-auto w-full max-w-3xl lg:max-w-6xl">
		{#if loading}
			<!-- mesmo formato da página: uma coluna no celular, fotos à esquerda e compra à direita no computador -->
			<div
				class="space-y-4 px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-8 lg:space-y-0 lg:px-8 lg:pt-10"
				role="status"
				aria-live="polite"
				aria-busy="true"
			>
				<span class="sr-only">Carregando anúncio...</span>
				<div class="space-y-4" aria-hidden="true">
					<div class="placeholder aspect-[16/10] w-full animate-pulse rounded-container"></div>
					<div class="hidden space-y-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-6 shadow-sm lg:block">
						<div class="placeholder h-6 w-32 animate-pulse rounded-full"></div>
						<div class="placeholder h-4 w-full animate-pulse rounded-full"></div>
						<div class="placeholder h-4 w-5/6 animate-pulse rounded-full"></div>
					</div>
				</div>
				<div class="space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm lg:p-6" aria-hidden="true">
					<div class="flex items-start gap-3">
						<div class="flex-1 space-y-2">
							<div class="placeholder h-7 w-11/12 animate-pulse rounded-full"></div>
							<div class="placeholder h-7 w-1/2 animate-pulse rounded-full"></div>
						</div>
						<div class="placeholder h-11 w-11 animate-pulse rounded-base"></div>
					</div>
					<div class="placeholder h-3 w-16 animate-pulse rounded-full"></div>
					<div class="placeholder h-9 w-2/3 animate-pulse rounded-full"></div>
					<div class="placeholder h-12 w-full animate-pulse rounded-base"></div>
				</div>
			</div>
		{:else if errorMessage}
			<div class="mx-4 mt-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
				<CircleAlert class="h-5 w-5 shrink-0" />
				{errorMessage}
			</div>
		{:else if item}
			<nav class="hidden min-w-0 items-center gap-1.5 px-8 pt-6 text-sm lg:flex" aria-label="Caminho">
				<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
					<Home size={16} />
					Início
				</a>
				<span class="text-surface-700-300">/</span>
				<a href={resolve('/buscar')} class="text-surface-800-200 hover:text-primary-700-300">Buscar</a>
				<span class="text-surface-700-300">/</span>
				<span class="truncate font-semibold text-surface-950-50" aria-current="page">{item.title}</span>
			</nav>

			<!-- celular: uma coluna; computador: conteúdo à esquerda e compra/anunciante fixos à direita -->
			<div class="space-y-4 px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-8 lg:gap-y-5 lg:space-y-0 lg:px-8 lg:pt-4">
				<!-- fotos -->
				<section class="relative overflow-hidden rounded-container bg-surface-50-950 shadow-sm lg:col-start-1">
					{#if galleryImages.length > 0}
						{#if galleryImages.length === 1}
							<img
								src={galleryImages[0]}
								alt={item.title}
								class="aspect-[16/10] w-full object-cover"
							/>
						{:else}
							<!-- setas e pontos (clique), arrastar com o mouse ou o dedo e setas do teclado trocam a foto -->
							<Carousel
								slideCount={galleryImages.length}
								page={galleryPage}
								onPageChange={(details) => (galleryPage = details.page)}
								allowMouseDrag
								loop
							>
								<Carousel.ItemGroup class="flex">
									{#each galleryImages as imageUrl, index (imageUrl + index)}
										<Carousel.Item {index}>
											<img
												src={imageUrl}
												alt={`${item.title} — imagem ${index + 1}`}
												draggable="false"
												class="aspect-[16/10] w-full select-none object-cover"
											/>
										</Carousel.Item>
									{/each}
								</Carousel.ItemGroup>

								<Carousel.PrevTrigger
									class="btn-icon btn-icon-lg preset-filled-surface-50-950 absolute left-3 top-1/2 -translate-y-1/2 shadow-md"
									title="Foto anterior"
									aria-label="Foto anterior"
								>
									<ChevronLeft size={18} />
								</Carousel.PrevTrigger>
								<Carousel.NextTrigger
									class="btn-icon btn-icon-lg preset-filled-surface-50-950 absolute right-3 top-1/2 -translate-y-1/2 shadow-md"
									title="Próxima foto"
									aria-label="Próxima foto"
								>
									<ChevronRight size={18} />
								</Carousel.NextTrigger>

								<Carousel.IndicatorGroup
									class="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5"
									aria-label="Fotos do anúncio"
								>
									{#each galleryImages as imageUrl, index (imageUrl + index)}
										<Carousel.Indicator
											{index}
											aria-label="Foto {index + 1} de {galleryImages.length}"
											class="h-2 w-2 rounded-full bg-white/60 transition-all data-[current]:w-5 data-[current]:bg-white"
										/>
									{/each}
								</Carousel.IndicatorGroup>
							</Carousel>
							<span class="badge absolute right-3 top-3 gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
								<Images class="h-3.5 w-3.5" />
								{galleryPage + 1} / {galleryImages.length}
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

				<!-- título, preço e ação principal (no computador, coluna da direita que acompanha a rolagem) -->
				<div class="lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-stretch">
				<div class="space-y-4 lg:sticky lg:top-20">
				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm lg:p-6">
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
				{@render sellerCard('hidden lg:flex')}
				</div>
				</div>

				{#if item.description}
					<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm lg:col-start-1 lg:p-6">
						<h2 class="preset-typo-title">Descrição</h2>
						<p class="mt-2 whitespace-pre-line preset-typo-body-1 text-surface-900-100">{item.description}</p>
					</section>
				{/if}

				<AppAccordion title="Mais informações" class="lg:col-start-1">
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

				{@render sellerCard('lg:hidden')}

				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm lg:col-start-1">
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

	<SiteFooter />
	<BottomNav active="" />
</div>
