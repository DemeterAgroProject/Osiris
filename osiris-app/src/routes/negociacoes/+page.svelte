<script>
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Archive, CalendarDays, ChevronRight, CircleAlert, Home, Inbox, MessageSquare, Tractor, Briefcase, Package } from 'lucide-svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import AppTabs from '$lib/components/ui/AppTabs.svelte';
	import AppTabsPanel from '$lib/components/ui/AppTabsPanel.svelte';
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
			recusada: 'Recusada',
			cancelado: 'Cancelada'
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
			case 'cancelado':
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
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- mapa local, não é estado
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
	const negotiationTabs = [
		{ value: 'propostas', label: 'Propostas' },
		{ value: 'operacoes', label: 'Operações' }
	];

	let activeTab = $state('propostas');

	const openNegotiations = $derived(
		negotiations.filter((n) => isNegotiationOpen(n.status))
	);
	const closedNegotiations = $derived(
		negotiations.filter((n) => ['aceita', 'recusada', 'cancelado'].includes(n.status))
	);
	const activeBookings = $derived(
		bookings.filter((b) => !['finalizada', 'cancelado', 'bloqueado_prestador'].includes(b.status))
	);
	const closedBookings = $derived(
		bookings.filter((b) => ['finalizada', 'cancelado', 'bloqueado_prestador'].includes(b.status))
	);

	// resumo do topo (computador)
	const dealStats = $derived([
		{
			label: 'Propostas em andamento',
			value: openNegotiations.length,
			hint: 'aguardando acordo',
			icon: MessageSquare,
			tone: 'preset-tonal-warning'
		},
		{
			label: 'Operações ativas',
			value: activeBookings.length,
			hint: 'aguardando início ou em campo',
			icon: Tractor,
			tone: 'preset-tonal-primary'
		},
		{
			label: 'Encerradas',
			value: closedNegotiations.length + closedBookings.length,
			hint: 'propostas e operações',
			icon: Archive,
			tone: 'preset-tonal-surface'
		}
	]);

	function resolveBookingCounterparty(booking) {
		const isProvider = authUserId === booking.provider_id;
		const profile = isProvider ? booking.client : booking.provider;
		return profile?.display_name || (isProvider ? 'Cliente' : 'Anunciante');
	}

	function statusBadgeClass(tone) {
		const map = {
			amber: 'preset-tonal-warning',
			blue: 'preset-tonal-secondary',
			green: 'preset-tonal-primary',
			red: 'preset-tonal-error',
			emerald: 'preset-tonal-primary',
			gray: 'preset-tonal-surface'
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
			await goto(resolve('/login?redirect=/negociacoes'));
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
				'Não foi possível carregar as negociações. Tente novamente.';
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

{#snippet dealCard(card)}
	<a
		href={resolve(card.href)}
		class="flex items-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-3 shadow-sm transition-colors hover:border-primary-500 lg:gap-5 lg:p-4 {card.muted ? 'opacity-90' : ''}"
	>
		<div
			class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-container lg:h-24 lg:w-32 {card.muted ? 'bg-surface-100-900 text-surface-800-200' : 'preset-tonal-primary'}"
		>
			{#if card.coverUrl}
				<img src={card.coverUrl} alt="" class="h-full w-full object-cover {card.muted ? 'grayscale' : ''}" />
			{:else}
				<card.icon class="h-7 w-7" />
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<span class="badge mb-1 rounded-full px-2 py-0.5 uppercase text-xs font-bold tracking-wide {statusBadgeClass(card.tone)}">
				{card.statusLabel}
			</span>
			<p class="line-clamp-2 preset-typo-card-title lg:text-lg">{card.title}</p>
			<p class="truncate text-sm text-surface-800-200">{card.subtitle}</p>
			{#if card.price || card.dates}
				<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 lg:hidden">
					{#if card.price}
						<span class="text-base font-bold text-primary-700-300">{card.price}</span>
					{/if}
					{#if card.dates}
						<span class="flex items-center gap-1 text-xs text-surface-800-200">
							<CalendarDays class="h-3.5 w-3.5" />
							{card.dates}
						</span>
					{/if}
				</div>
			{/if}
		</div>
		<ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300 lg:hidden" />

		<!-- computador: valor e período à direita, e a ação do card (o card inteiro já é o link) -->
		{#if card.price || card.dates}
			<div class="hidden shrink-0 text-right lg:block">
				{#if card.price}
					<p class="preset-typo-label">{card.href.startsWith('/operacoes') ? 'Valor acordado' : 'Valor proposto'}</p>
					<p class="text-2xl font-bold leading-tight text-primary-700-300">{card.price}</p>
				{/if}
				{#if card.dates}
					<p class="mt-0.5 inline-flex items-center gap-1 preset-typo-caption">
						<CalendarDays size={14} />
						{card.dates}
					</p>
				{/if}
			</div>
		{/if}
		<span class="btn preset-tonal hidden shrink-0 lg:inline-flex" aria-hidden="true">
			<span>{card.href.startsWith('/operacoes') ? 'Ver operação' : 'Abrir conversa'}</span>
			<ChevronRight size={18} />
		</span>
	</a>
{/snippet}

{#snippet emptyCard(title, hint)}
	<div class="flex flex-col items-center rounded-container border border-dashed border-surface-300-700 bg-surface-50-950 px-4 py-10 text-center">
		<Inbox class="h-9 w-9 text-surface-700-300" />
		<p class="mt-2 text-base font-semibold text-surface-950-50">{title}</p>
		{#if hint}
			<p class="mt-1 text-sm text-surface-800-200">{hint}</p>
		{/if}
	</div>
{/snippet}

<div class="min-h-screen pb-24">
	<Header title="Negociações" />

	<main class="mx-auto w-full max-w-3xl px-4 py-4 lg:max-w-6xl lg:px-8 lg:py-6">
		<nav class="mb-3 hidden items-center gap-1.5 text-sm lg:flex" aria-label="Caminho">
			<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
				<Home size={16} />
				Início
			</a>
			<span class="text-surface-700-300">/</span>
			<span class="font-semibold text-surface-950-50" aria-current="page">Negociações</span>
		</nav>

		<div>
			<h1 class="preset-typo-headline">Negociações</h1>
			<p class="mt-1 preset-typo-subtitle">Propostas, conversas e operações no campo.</p>
		</div>

		<!-- computador: resumo (contagens do que já foi carregado) -->
		{#if !loading && !errorMessage}
			<div class="mt-5 hidden grid-cols-3 gap-4 lg:grid">
				{#each dealStats as stat (stat.label)}
					<div class="flex items-center gap-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-5 shadow-sm">
						<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-container {stat.tone}">
							<stat.icon size={24} />
						</span>
						<div class="min-w-0">
							<p class="preset-typo-label">{stat.label}</p>
							<p class="text-3xl font-bold leading-tight text-surface-950-50">{stat.value}</p>
							<p class="preset-typo-caption">{stat.hint}</p>
						</div>
					</div>
				{/each}
			</div>
		{:else if loading}
			<div class="mt-5 hidden lg:block">
				<ListingSkeleton variant="stats" count={3} label="Carregando resumo..." />
			</div>
		{/if}

		<AppTabs bind:value={activeTab} items={negotiationTabs} label="Negociações" class="mt-4">
			{#if loading}
				<div class="mt-5">
					<ListingSkeleton variant="list" count={3} label="Carregando negociações..." />
				</div>
			{:else if errorMessage}
				<div class="mt-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
					<CircleAlert class="h-5 w-5 shrink-0" />
					{errorMessage}
				</div>
			{:else}
				<AppTabsPanel value="propostas">
					<section class="mt-5 space-y-6">
						<div>
							<h2 class="preset-typo-label">Em andamento</h2>
							<div class="mt-2 space-y-2">
								{#each openNegotiations as row (row.id)}
									{@render dealCard({
										href: `/negociacoes/${row.id}`,
										coverUrl: row.coverUrl,
										icon: listingIcon(row),
										title: resolveListingTitle(row),
										subtitle: `${authUserId === row.provider_id ? 'Cliente' : 'Anunciante'}: ${resolveCounterpartyName(row)}`,
										price: formatCurrency(row.proposed_price),
										dates: row.proposed_start_date
											? `${formatDbDate(row.proposed_start_date)} — ${formatDbDate(row.proposed_end_date)}`
											: '',
										statusLabel: negotiationStatusLabel(row.status),
										tone: negotiationStatusTone(row.status)
									})}
								{:else}
									{@render emptyCard('Nenhuma proposta em andamento', 'Abra um anúncio e toque em "Negociar".')}
								{/each}
							</div>
						</div>

						{#if closedNegotiations.length}
							<div>
								<h2 class="preset-typo-label">Encerradas</h2>
								<div class="mt-2 space-y-2">
									{#each closedNegotiations as row (row.id)}
										{@render dealCard({
											href: `/negociacoes/${row.id}`,
											coverUrl: null,
											icon: MessageSquare,
											title: resolveListingTitle(row),
											subtitle: resolveCounterpartyName(row),
											statusLabel: negotiationStatusLabel(row.status),
											tone: negotiationStatusTone(row.status),
											muted: true
										})}
									{/each}
								</div>
							</div>
						{/if}
					</section>
				</AppTabsPanel>
				<AppTabsPanel value="operacoes">
					<section class="mt-5 space-y-6">
						<div>
							<h2 class="preset-typo-label">Ativas</h2>
							<div class="mt-2 space-y-2">
								{#each activeBookings as booking (booking.id)}
									{@render dealCard({
										href: `/operacoes/${booking.id}`,
										coverUrl: booking.coverUrl,
										icon: listingIcon(booking),
										title: resolveListingTitle(booking),
										subtitle: resolveBookingCounterparty(booking),
										price: formatCurrency(booking.total_price),
										dates: `${formatDbDate(booking.start_date)} — ${formatDbDate(booking.end_date)}`,
										statusLabel: bookingStatusLabel(booking.status),
										tone: bookingStatusTone(booking.status)
									})}
								{:else}
									{@render emptyCard('Nenhuma operação ativa', 'Quando uma proposta for aceita, a operação aparece aqui.')}
								{/each}
							</div>
						</div>

						{#if closedBookings.length}
							<div>
								<h2 class="preset-typo-label">Encerradas</h2>
								<div class="mt-2 space-y-2">
									{#each closedBookings as booking (booking.id)}
										{@render dealCard({
											href: `/operacoes/${booking.id}`,
											coverUrl: booking.coverUrl,
											icon: listingIcon(booking),
											title: resolveListingTitle(booking),
											subtitle: resolveBookingCounterparty(booking),
											dates: `${formatDbDate(booking.start_date)} — ${formatDbDate(booking.end_date)}`,
											statusLabel: bookingStatusLabel(booking.status),
											tone: bookingStatusTone(booking.status),
											muted: true
										})}
									{/each}
								</div>
							</div>
						{/if}
					</section>
				</AppTabsPanel>
			{/if}
		</AppTabs>
	</main>

	<SiteFooter />
	<BottomNav active="mais" />
</div>
