<script>
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import NegotiationPropose from '$lib/components/NegotiationPropose.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import ReviewList from '$lib/components/ReviewList.svelte';
	import { supabase } from '$lib/supabase';
	import { ChevronLeft } from 'lucide-svelte';

	function resolveDisplayName(profile, authUser) {
		return (
			profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
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

	function mapReviewRow(row, machineryNamesById = {}) {
		const reviewer = row.reviewer ?? row.profiles ?? null;
		const products = row.products ?? null;
		const productId = row.product_id;
		const productName =
			products?.name ||
			(productId && machineryNamesById[String(productId)]) ||
			row.product_name ||
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

	async function fetchReviewsForProduct(productId) {
		const { data, error } = await supabase
			.from('reviews')
			.select(
				`
			id,
			rating,
			comment,
			created_at,
			reviewer:profiles!reviewer_id (
				display_name,
				photo_url,
				full_name,
				name
			)
		`
			)
			.eq('product_id', productId)
			.order('created_at', { ascending: false });

		if (error) {
			return { reviews: [], error };
		}

		return {
			reviews: (data ?? []).map((row) => mapReviewRow(row)),
			error: null
		};
	}

	async function fetchReviewsForUser(revieweeId) {
		const { data, error } = await supabase
			.from('reviews')
			.select(
				`
			id,
			rating,
			comment,
			created_at,
			product_id,
			reviewer:profiles!reviewer_id (
				display_name,
				photo_url,
				full_name,
				name
			),
			products (
				name
			)
		`
			)
			.eq('reviewee_id', revieweeId)
			.order('created_at', { ascending: false });

		if (error) {
			return { reviews: [], error };
		}

		const rows = data ?? [];
		const missingNameIds = [
			...new Set(
				rows
					.filter((row) => !row.products?.name && row.product_id)
					.map((row) => String(row.product_id))
			)
		];

		let machineryNamesById = {};

		if (missingNameIds.length > 0) {
			const { data: machinery } = await supabase
				.from('agricultural_machinery')
				.select('id, name')
				.in('id', missingNameIds);

			machineryNamesById = Object.fromEntries((machinery ?? []).map((item) => [item.id, item.name]));
		}

		return {
			reviews: rows.map((row) => mapReviewRow(row, machineryNamesById)),
			error: null
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
	let reviews = $state([]);
	let reviewsLoading = $state(false);
	let sellerReviewStats = $state({ average: 0, count: 0 });

	const routeTipo = $derived(page.params.tipo);
	const routeId = $derived(page.params.id);

	const productReviewStats = $derived(computeReviewStats(reviews));

	function formatCurrency(value) {
		if (value === null || value === undefined || value === '') return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
	}

	function resolveSellerName(profile) {
		return (
			profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
			profile?.username ||
			profile?.email ||
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
			.select('*')
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

		if (error) {
			console.error('Erro ao carregar avaliações do anúncio:', error.message);
		}

		reviewsLoading = false;
	}

	async function loadItemDetails() {
		loading = true;
		errorMessage = '';
		item = null;
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
				.select('id, name, price, category, quantity, stock_unit, status, owner_id, created_at')
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
				priceLabel: formatCurrency(data.price),
				description: 'Anúncio público de produto no marketplace Osiris.',
				details: [
					{ label: 'Categoria', value: data.category || 'Não informado' },
					{ label: 'Quantidade', value: data.quantity ?? 'Não informado' },
					{ label: 'Unidade', value: data.stock_unit || 'Não informado' },
					{ label: 'Status', value: data.status || 'Não informado' }
				]
			};

			await Promise.all([loadSeller(data.owner_id), loadProductReviews(data.id)]);
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
				priceLabel: `${formatCurrency(data.price)} / hora`,
				description: data.description || 'Anúncio de maquinário agrícola no marketplace Osiris.',
				details: [
					{ label: 'Tipo', value: machinery.machinery_types?.name || 'Não informado' },
					{ label: 'Marca', value: machinery.brands?.name || 'Não informado' },
					{ label: 'Modelo', value: machinery.model || 'Não informado' },
					{ label: 'Ano', value: machinery.manufacture_year || 'Não informado' },
					{ label: 'Horímetro', value: machinery.current_horimeter || 'Não informado' },
					{ label: 'Status', value: data.status || 'Não informado' }
				]
			};

			await Promise.all([loadSeller(data.owner_id), loadProductReviews(data.id)]);
		} else if (routeTipo === 'servico') {
			const { data, error } = await supabase
				.from('services')
				.select('id, title, price, description, service_type, pricing_model, location, status, owner_id, created_at')
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
				priceLabel: formatCurrency(data.price),
				description: data.description || 'Serviço no marketplace Osiris.',
				details: [
					{ label: 'Tipo', value: data.service_type || 'Não informado' },
					{ label: 'Modelo de preço', value: data.pricing_model || 'Não informado' },
					{ label: 'Local', value: data.location || 'Não informado' },
					{ label: 'Status', value: data.status || 'Não informado' }
				]
			};

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

<div class="min-h-screen bg-gray-100 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl">
		<a
			href="/buscar"
			class="mx-4 mt-4 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600"
		>
			<ChevronLeft class="h-4 w-4" />
			Voltar
		</a>

		{#if loading}
			<div class="px-4 py-10 text-center text-sm text-gray-500">Carregando anúncio...</div>
		{:else if errorMessage}
			<div class="mx-4 mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if item}
			<section class="mt-4 rounded-t-3xl bg-white p-4 shadow-sm">
				<div class="aspect-[16/10] rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50"></div>

				<div class="mt-4 flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-3xl font-extrabold text-green-700">{item.priceLabel}</p>
						<h1 class="mt-2 text-3xl font-bold text-gray-900">{item.title}</h1>
						<p class="mt-3 text-base leading-7 text-gray-600">{item.description}</p>
					</div>
					<FavoriteButton
						productId={item.productId ?? null}
						serviceId={item.serviceId ?? null}
					/>
				</div>

				<div class="mt-6 overflow-hidden rounded-2xl border border-gray-200">
					<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
						<h2 class="text-2xl font-semibold text-gray-900">Detalhes</h2>
					</div>
					<div class="divide-y divide-gray-200 px-4">
						{#each item.details as detail}
							<div class="grid grid-cols-2 gap-3 py-3 text-sm">
								<p class="font-semibold text-gray-500">{detail.label}</p>
								<p class="font-medium text-gray-800">{detail.value}</p>
							</div>
						{/each}
					</div>
				</div>

				<a
					href={seller.id ? `/perfil/${seller.id}` : '#'}
					class="mt-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-green-300"
				>
					{#if seller.avatarUrl}
						<img src={seller.avatarUrl} alt={seller.name} class="h-14 w-14 rounded-full object-cover" />
					{:else}
						<div
							class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700"
						>
							{seller.name.slice(0, 1).toUpperCase()}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-green-700">Anunciante</p>
						<p class="truncate text-xl font-semibold text-gray-900">{seller.name}</p>
						<Rating
							value={sellerReviewStats.average}
							count={sellerReviewStats.count}
							size="sm"
						/>
					</div>
				</a>

				<button
					onclick={() => (showNegotiationModal = true)}
					class="mt-6 w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-800"
				>
					Negociar
				</button>

				<div class="mt-8 overflow-hidden rounded-2xl border border-gray-200">
					<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
						<h2 class="text-lg font-semibold text-gray-900">Avaliações do anúncio</h2>
						<div class="mt-1">
							<Rating
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
				</div>
			</section>
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

	<BottomNav />
</div>
