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

	function resolveListingTitle(negotiation) {
		return negotiation?.products?.name || negotiation?.services?.title || 'Anúncio';
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

	async function fetchProfileBrief(profileId) {
		if (!profileId) return null;
		const { data } = await supabase
			.from('profiles')
			.select('display_name, photo_url')
			.eq('id', profileId)
			.maybeSingle();
		return data;
	}

	async function enrichNegotiationRow(row) {
		const [products, services, client, provider] = await Promise.all([
			row.product_id
				? supabase
						.from('products')
						.select('name, category')
						.eq('id', row.product_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			row.service_id
				? supabase
						.from('services')
						.select('title')
						.eq('id', row.service_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			fetchProfileBrief(row.client_id),
			fetchProfileBrief(row.provider_id)
		]);

		return { ...row, products, services, client, provider };
	}

	async function enrichBookingRow(row) {
		const [products, services] = await Promise.all([
			row.product_id
				? supabase
						.from('products')
						.select('name')
						.eq('id', row.product_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			row.service_id
				? supabase
						.from('services')
						.select('title')
						.eq('id', row.service_id)
						.maybeSingle()
						.then((r) => r.data)
				: null
		]);

		return { ...row, products, services };
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
				.select('id, status, start_date, end_date, total_price, created_at, product_id, service_id')
				.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
				.order('created_at', { ascending: false })
		]);

		if (negRes.error) {
			console.error('Erro ao listar negociações:', negRes.error);
			errorMessage =
				'Não foi possível carregar as negociações. Verifique as políticas RLS de leitura (SELECT) no Supabase.';
			negotiations = [];
		} else {
			const rows = negRes.data ?? [];
			negotiations = await Promise.all(rows.map(enrichNegotiationRow));
		}

		if (bookRes.error) {
			console.error('Erro ao listar operações:', bookRes.error);
		} else {
			const rows = bookRes.data ?? [];
			bookings = await Promise.all(rows.map(enrichBookingRow));
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
									class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50"
								>
									<Icon class="h-5 w-5 text-green-700" />
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
			<section class="mt-6 space-y-2">
				{#each activeBookings as booking (booking.id)}
					<a
						href="/operacoes/{booking.id}"
						class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-green-200"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-gray-900">
								{booking.products?.name || booking.services?.title || 'Operação'}
							</p>
							<p class="text-xs text-gray-500">
								{formatDbDate(booking.start_date)} — {formatDbDate(booking.end_date)}
							</p>
							<p class="mt-0.5 text-sm font-medium text-green-700">
								{formatCurrency(booking.total_price)}
							</p>
						</div>
						<span
							class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {statusBadgeClass(
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
			</section>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
