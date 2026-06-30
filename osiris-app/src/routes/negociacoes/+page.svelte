<script>
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { MessageSquare, ChevronRight, Tractor, Briefcase, Package } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';

	function formatCurrency(value) {
		if (value === null || value === undefined || value === '') return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
	}

	function formatDbDate(dateString) {
		if (!dateString) return '—';
		const [year, month, day] = String(dateString).split('T')[0].split('-');
		if (!year || !month || !day) return dateString;
		return `${day}/${month}/${year}`;
	}

	function negotiationStatusLabel(status) {
		const map = {
			solicitada: 'Solicitada',
			em_negociacao: 'Em negociação',
			aceita: 'Aceita',
			recusada: 'Recusada'
		};
		return map[status] ?? status ?? '—';
	}

	function negotiationStatusTone(status) {
		switch (status) {
			case 'solicitada':
				return 'amber';
			case 'em_negociacao':
				return 'blue';
			case 'aceita':
				return 'green';
			case 'recusada':
				return 'red';
			default:
				return 'gray';
		}
	}

	function bookingStatusLabel(status) {
		const map = {
			pendente: 'Aguardando início',
			em_operacao: 'Em operação',
			em_avaliacao: 'Em avaliação',
			finalizada: 'Finalizada',
			cancelado: 'Cancelado',
			bloqueado_prestador: 'Bloqueado'
		};
		return map[status] ?? status ?? '—';
	}

	function bookingStatusTone(status) {
		switch (status) {
			case 'pendente':
				return 'amber';
			case 'em_operacao':
				return 'green';
			case 'em_avaliacao':
				return 'blue';
			case 'finalizada':
				return 'emerald';
			case 'cancelado':
			case 'bloqueado_prestador':
				return 'red';
			default:
				return 'gray';
		}
	}

	function resolveListingTitle(row) {
		return row?.products?.name || row?.services?.title || 'Anúncio';
	}

	function listingHref(row) {
		if (row?.service_id) return `/anuncio/servico/${row.service_id}`;
		if (row?.product_id) {
			return row.products?.category === 'Maquinário'
				? `/anuncio/maquinario/${row.product_id}`
				: `/anuncio/produto/${row.product_id}`;
		}
		return null;
	}

	function pickCoverImage(images = []) {
		if (!images?.length) return null;
		const cover = images.find((img) => img.is_cover && img.url?.trim());
		return cover?.url?.trim() ?? images.find((img) => img.url?.trim())?.url?.trim() ?? null;
	}

	function coverUrlFromMap(imagesByProductId, productId) {
		const images = imagesByProductId.get(productId) ?? [];
		return pickCoverImage(images);
	}

	async function fetchProductImagesByProductIds(productIds) {
		const map = new Map();
		const uniqueIds = [...new Set((productIds ?? []).filter(Boolean))];
		if (!uniqueIds.length) return map;

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

	async function fetchMapByIds(table, ids, select) {
		const uniqueIds = [...new Set((ids ?? []).filter(Boolean))];
		if (!uniqueIds.length) return new Map();

		const { data, error } = await supabase.from(table).select(select).in('id', uniqueIds);
		if (error) {
			console.error(`Erro ao carregar ${table}:`, error);
			return new Map();
		}

		return new Map((data ?? []).map((row) => [row.id, row]));
	}

	async function enrichNegotiations(rows) {
		const productIds = rows.map((row) => row.product_id);
		const serviceIds = rows.map((row) => row.service_id);
		const profileIds = rows.flatMap((row) => [row.client_id, row.provider_id]);

		const [productsMap, servicesMap, profilesMap, imagesMap] = await Promise.all([
			fetchMapByIds('products', productIds, 'id, name, category'),
			fetchMapByIds('services', serviceIds, 'id, title'),
			fetchMapByIds('profiles', profileIds, 'id, display_name, photo_url'),
			fetchProductImagesByProductIds(productIds)
		]);

		return rows.map((row) => ({
			...row,
			products: row.product_id ? productsMap.get(row.product_id) ?? null : null,
			services: row.service_id ? servicesMap.get(row.service_id) ?? null : null,
			client: row.client_id ? profilesMap.get(row.client_id) ?? null : null,
			provider: row.provider_id ? profilesMap.get(row.provider_id) ?? null : null,
			coverUrl: row.product_id ? coverUrlFromMap(imagesMap, row.product_id) : null
		}));
	}

	async function enrichBookings(rows) {
		const productIds = rows.map((row) => row.product_id);
		const serviceIds = rows.map((row) => row.service_id);
		const profileIds = rows.flatMap((row) => [row.client_id, row.provider_id]);

		const [productsMap, servicesMap, profilesMap, imagesMap] = await Promise.all([
			fetchMapByIds('products', productIds, 'id, name, category'),
			fetchMapByIds('services', serviceIds, 'id, title'),
			fetchMapByIds('profiles', profileIds, 'id, display_name, photo_url'),
			fetchProductImagesByProductIds(productIds)
		]);

		return rows.map((row) => ({
			...row,
			products: row.product_id ? productsMap.get(row.product_id) ?? null : null,
			services: row.service_id ? servicesMap.get(row.service_id) ?? null : null,
			client: row.client_id ? profilesMap.get(row.client_id) ?? null : null,
			provider: row.provider_id ? profilesMap.get(row.provider_id) ?? null : null,
			coverUrl: row.product_id ? coverUrlFromMap(imagesMap, row.product_id) : null
		}));
	}

	function isNegotiationOpen(status) {
		return status === 'solicitada' || status === 'em_negociacao';
	}

	let loading = $state(true);
	let authUserId = $state(null);
	let negotiations = $state([]);
	let bookings = $state([]);
	let errorMessage = $state('');
	let activeTab = $state('propostas');

	const openNegotiations = $derived(
		negotiations.filter((n) => isNegotiationOpen(n.status))
	);
	const closedNegotiations = $derived(
		negotiations.filter((n) => n.status === 'aceita' || n.status === 'recusada')
	);
	const activeBookings = $derived(
		bookings.filter((b) => !['finalizada', 'cancelado', 'bloqueado_prestador'].includes(b.status))
	);
	const closedBookings = $derived(
		bookings.filter((b) => ['finalizada', 'cancelado', 'bloqueado_prestador'].includes(b.status))
	);

	function resolveBookingCounterparty(booking) {
		const isProvider = authUserId === booking.provider_id;
		const profile = isProvider ? booking.client : booking.provider;
		return profile?.display_name || (isProvider ? 'Cliente' : 'Anunciante');
	}

	function statusBadgeClass(tone) {
		const map = {
			amber: 'bg-amber-100 text-amber-800',
			blue: 'bg-blue-100 text-blue-800',
			green: 'bg-green-100 text-green-800',
			red: 'bg-red-100 text-red-800',
			emerald: 'bg-emerald-100 text-emerald-800',
			gray: 'bg-gray-100 text-gray-700'
		};
		return map[tone] ?? map.gray;
	}

	function resolveCounterpartyName(row) {
		const isProvider = authUserId === row.provider_id;
		const profile = isProvider ? row.client : row.provider;
		return profile?.display_name || (isProvider ? 'Cliente' : 'Anunciante');
	}

	function listingIcon(row) {
		if (row.service_id) return Briefcase;
		if (row.product_id && row.products?.category === 'Maquinário') return Tractor;
		return Package;
	}

	async function loadData() {
		loading = true;
		errorMessage = '';

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto('/login?redirect=/negociacoes');
			return;
		}

		authUserId = user.id;

		const [negRes, bookRes] = await Promise.all([
			supabase
				.from('negotiations')
				.select('*')
				.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
				.order('updated_at', { ascending: false }),
			supabase
				.from('bookings')
				.select(
					'id, status, start_date, end_date, total_price, created_at, product_id, service_id, client_id, provider_id'
				)
				.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
				.order('created_at', { ascending: false })
		]);

		if (negRes.error) {
			console.error('Erro ao listar negociações:', negRes.error);
			errorMessage =
				'Não foi possível carregar as negociações. Verifique as políticas RLS de leitura (SELECT) no Supabase.';
			negotiations = [];
		} else {
			negotiations = await enrichNegotiations(negRes.data ?? []);
		}

		if (bookRes.error) {
			console.error('Erro ao listar operações:', bookRes.error);
			if (!errorMessage) {
				errorMessage = 'Não foi possível carregar as operações.';
			}
			bookings = [];
		} else {
			bookings = await enrichBookings(bookRes.data ?? []);
		}

		loading = false;
	}

	onMount(() => {
		loadData();
	});

	afterNavigate(({ to }) => {
		if (to?.url.pathname === '/negociacoes') {
			loadData();
		}
	});
</script>

<svelte:head>
	<title>Negociações — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Negociações</h1>
			<p class="mt-1 text-sm text-gray-500">Propostas, chat e contratos ativos no campo.</p>
		</div>

		<div class="mt-4 flex gap-2 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
			<button
				type="button"
				onclick={() => (activeTab = 'propostas')}
				class="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors {activeTab ===
				'propostas'
					? 'bg-green-600 text-white'
					: 'text-gray-600 hover:bg-gray-50'}"
			>
				Propostas
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'operacoes')}
				class="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors {activeTab ===
				'operacoes'
					? 'bg-green-600 text-white'
					: 'text-gray-600 hover:bg-gray-50'}"
			>
				Operações
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center py-16">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
				></div>
			</div>
		{:else if errorMessage}
			<div class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if activeTab === 'propostas'}
			<section class="mt-6 space-y-6">
				<div>
					<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Em andamento</h2>
					<div class="mt-3 space-y-2">
						{#each openNegotiations as row (row.id)}
							{@const Icon = listingIcon(row)}
							<a
								href="/negociacoes/{row.id}"
								class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-green-200"
							>
								<div
									class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50"
								>
									{#if row.coverUrl}
										<img src={row.coverUrl} alt="" class="h-full w-full object-cover" />
									{:else}
										<Icon class="h-5 w-5 text-green-700" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold text-gray-900">{resolveListingTitle(row)}</p>
									<p class="text-xs text-gray-500">
										{authUserId === row.provider_id ? 'Cliente' : 'Anunciante'}:
										{resolveCounterpartyName(row)}
									</p>
									<p class="mt-0.5 text-sm font-medium text-green-700">
										{formatCurrency(row.proposed_price)}
									</p>
									{#if row.proposed_start_date}
										<p class="mt-0.5 text-xs text-gray-400">
											{formatDbDate(row.proposed_start_date)} — {formatDbDate(row.proposed_end_date)}
										</p>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1">
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {statusBadgeClass(
											negotiationStatusTone(row.status)
										)}"
									>
										{negotiationStatusLabel(row.status)}
									</span>
									<ChevronRight class="h-4 w-4 text-gray-300" />
								</div>
							</a>
						{:else}
							<div
								class="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500"
							>
								Nenhuma proposta em andamento.
							</div>
						{/each}
					</div>
				</div>

				<div>
					<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Encerradas</h2>
					<div class="mt-3 space-y-2">
						{#each closedNegotiations as row (row.id)}
							<a
								href="/negociacoes/{row.id}"
								class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 opacity-90 shadow-sm"
							>
								<div
									class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50"
								>
									<MessageSquare class="h-5 w-5 text-gray-500" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold text-gray-900">{resolveListingTitle(row)}</p>
									<p class="text-xs text-gray-500">{resolveCounterpartyName(row)}</p>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {statusBadgeClass(
										negotiationStatusTone(row.status)
									)}"
								>
									{negotiationStatusLabel(row.status)}
								</span>
							</a>
						{:else}
							<p class="text-center text-sm text-gray-400 py-4">Nenhuma negociação encerrada.</p>
						{/each}
					</div>
				</div>
			</section>
		{:else}
			<section class="mt-6 space-y-6">
				<div class="space-y-2">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Ativas</h2>
				{#each activeBookings as booking (booking.id)}
					{@const Icon = listingIcon(booking)}
					<a
						href="/operacoes/{booking.id}"
						class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-green-200"
					>
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50"
						>
							{#if booking.coverUrl}
								<img src={booking.coverUrl} alt="" class="h-full w-full object-cover" />
							{:else}
								<Icon class="h-5 w-5 text-green-700" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-gray-900">
								{resolveListingTitle(booking)}
							</p>
							<p class="text-xs text-gray-500">
								{resolveBookingCounterparty(booking)}
							</p>
							<p class="text-xs text-gray-500">
								{formatDbDate(booking.start_date)} — {formatDbDate(booking.end_date)}
							</p>
							<p class="mt-0.5 text-sm font-medium text-green-700">
								{formatCurrency(booking.total_price)}
							</p>
						</div>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {statusBadgeClass(
								bookingStatusTone(booking.status)
							)}"
						>
							{bookingStatusLabel(booking.status)}
						</span>
					</a>
				{:else}
					<div
						class="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center"
					>
						<p class="text-sm font-semibold text-gray-800">Nenhuma operação ativa</p>
						<p class="mt-1 text-xs text-gray-500">
							Quando uma proposta for aceita, o contrato aparecerá aqui.
						</p>
					</div>
				{/each}
				</div>

				{#if closedBookings.length}
					<div class="space-y-2">
						<h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Encerradas</h2>
						{#each closedBookings as booking (booking.id)}
							<a
								href="/operacoes/{booking.id}"
								class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 opacity-90 shadow-sm"
							>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold text-gray-900">{resolveListingTitle(booking)}</p>
									<p class="text-xs text-gray-500">{resolveBookingCounterparty(booking)}</p>
									<p class="text-xs text-gray-500">
										{formatDbDate(booking.start_date)} — {formatDbDate(booking.end_date)}
									</p>
								</div>
								<span
									class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {statusBadgeClass(
										bookingStatusTone(booking.status)
									)}"
								>
									{bookingStatusLabel(booking.status)}
								</span>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
