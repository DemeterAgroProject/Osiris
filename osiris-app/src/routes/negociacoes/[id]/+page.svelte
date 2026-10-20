<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ArrowRight, CalendarDays, Check, CheckCircle2, CircleAlert, FileText, Home, MessagesSquare, Package, Quote, SlidersHorizontal, XCircle } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import AppConfirmDialog from '$lib/components/ui/AppConfirmDialog.svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { showToast } from '$lib/components/ui/toast.js';
	import NegotiationChat from '$lib/components/NegotiationChat.svelte';
	import { supabase } from '$lib/supabase';
	import { track, trackError } from '$lib/telemetry';
	import { watchChanges } from '$lib/realtime';
	import { userMessage } from '$lib/errors';

	function parseCurrencyToNumber(value) {
		if (value === null || value === undefined || value === '') return null;
		const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
		const numeric = Number(normalized);
		return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
	}

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

	function resolveListingTitle(negotiation) {
		return negotiation?.products?.name || negotiation?.services?.title || 'Anúncio';
	}

	function listingHref(negotiation) {
		if (negotiation?.service_id) return `/anuncio/servico/${negotiation.service_id}`;
		if (negotiation?.product_id) {
			return negotiation.products?.category === 'Maquinário'
				? `/anuncio/maquinario/${negotiation.product_id}`
				: `/anuncio/produto/${negotiation.product_id}`;
		}
		return null;
	}

	function pickCoverImage(images = []) {
		if (!images?.length) return null;
		const cover = images.find((img) => img.is_cover && img.url?.trim());
		return cover?.url?.trim() ?? images.find((img) => img.url?.trim())?.url?.trim() ?? null;
	}

	async function fetchProductCoverUrl(productId) {
		if (!productId) return null;
		const { data, error } = await supabase
			.from('product_images')
			.select('url, is_cover, created_at')
			.eq('product_id', productId)
			.order('is_cover', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Erro ao carregar imagens do anúncio:', error);
			return null;
		}

		return pickCoverImage(data ?? []);
	}

	function isNegotiationOpen(status) {
		return status === 'solicitada' || status === 'em_negociacao';
	}

	async function findBookingForNegotiation(neg) {
		if (!neg || neg.status !== 'aceita') return null;

		let query = supabase
			.from('bookings')
			.select('id, status, start_date, end_date, total_price, client_id, provider_id, created_at')
			.eq('client_id', neg.client_id)
			.eq('provider_id', neg.provider_id)
			.order('created_at', { ascending: false })
			.limit(1);

		if (neg.product_id) {
			query = query.eq('product_id', neg.product_id);
		} else if (neg.service_id) {
			query = query.eq('service_id', neg.service_id);
		}

		const { data } = await query.maybeSingle();
		return data;
	}

	let loading = $state(true);
	let authUserId = $state(null);
	let negotiation = $state(null);
	let linkedBooking = $state(null);
	let errorMessage = $state('');
	let actionLoading = $state(false);
	let showAcceptDialog = $state(false);
	let showRejectDialog = $state(false);
	// gaveta com os detalhes da proposta (celular)
	let detailsOpen = $state(false);

	// fecha a gaveta antes de abrir a confirmação, para não empilhar dois diálogos
	function openAccept() {
		detailsOpen = false;
		showAcceptDialog = true;
	}

	function openReject() {
		detailsOpen = false;
		showRejectDialog = true;
	}
	let editPrice = $state('');
	let editStart = $state('');
	let editEnd = $state('');

	const negotiationId = $derived(page.params.id);
	const isProvider = $derived(authUserId && negotiation?.provider_id === authUserId);
	const canManage = $derived(isNegotiationOpen(negotiation?.status));
	const chatDisabled = $derived(!canManage);

	// o NegotiationPropose grava a quantidade no fim da mensagem ("Quantidade solicitada: N")
	const QUANTITY_PATTERN = /\s*Quantidade solicitada:\s*([^\n]+?)\s*$/;
	const proposalQuantityRaw = $derived(negotiation?.message?.match(QUANTITY_PATTERN)?.[1] ?? '');
	const proposalQuantity = $derived(
		proposalQuantityRaw
			? `${proposalQuantityRaw} ${(negotiation?.products?.stock_unit ?? '').toLowerCase()}`.trim()
			: ''
	);
	const proposalMessage = $derived((negotiation?.message ?? '').replace(QUANTITY_PATTERN, '').trim());
	// valor de cada unidade, só quando a proposta pede mais de uma
	const unitPriceLabel = $derived.by(() => {
		const quantity = Number(proposalQuantityRaw.replace(',', '.'));
		const price = Number(negotiation?.proposed_price);
		if (!(quantity > 1) || !(price > 0)) return '';
		return `${formatCurrency(price / quantity)} cada`;
	});
	const proposalSentLabel = $derived.by(() => {
		const sent = negotiation?.created_at ? new Date(negotiation.created_at) : null;
		if (!sent || Number.isNaN(sent.getTime())) return '';
		const time = sent.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
		const day =
			sent.toDateString() === new Date().toDateString()
				? 'hoje'
				: `em ${sent.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
		return `Enviada ${day} às ${time}`;
	});

	function statusBadgeClass(tone) {
		const map = {
			amber: 'preset-tonal-warning',
			blue: 'preset-tonal-secondary',
			green: 'preset-tonal-primary',
			red: 'preset-tonal-error',
			gray: 'preset-tonal-surface'
		};
		return map[tone] ?? map.gray;
	}

	function counterpartyName() {
		const profile = isProvider ? negotiation?.client : negotiation?.provider;
		return profile?.display_name || 'Participante';
	}

	// foto que não carregou (link quebrado): mostra a inicial no lugar
	let failedPhoto = $state(null);

	function counterpartyPhoto() {
		const profile = isProvider ? negotiation?.client : negotiation?.provider;
		return profile?.photo_url || null;
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

	async function enrichNegotiation(row) {
		const [products, services, client, provider, coverUrl] = await Promise.all([
			row.product_id
				? supabase
						.from('products')
						.select('id, name, category, owner_id, stock_unit')
						.eq('id', row.product_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			row.service_id
				? supabase
						.from('services')
						.select('id, title, owner_id')
						.eq('id', row.service_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			fetchProfileBrief(row.client_id),
			fetchProfileBrief(row.provider_id),
			fetchProductCoverUrl(row.product_id)
		]);

		return { ...row, products, services, client, provider, coverUrl };
	}

	/** @param {{ silent?: boolean }} [options] silent: atualiza sem esconder a tela (mudança vinda do tempo real) */
	async function loadNegotiation({ silent = false } = {}) {
		if (!negotiationId) return;

		if (!silent) {
			loading = true;
			errorMessage = '';
			negotiation = null;
			linkedBooking = null;
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(resolve(`/login?redirect=/negociacoes/${negotiationId}`));
			return;
		}

		authUserId = user.id;

		const { data, error } = await supabase
			.from('negotiations')
			.select('*')
			.eq('id', negotiationId)
			.maybeSingle();

		if (error) {
			console.error('Erro ao carregar negociação:', error);
			errorMessage =
				userMessage(error, 'Não foi possível carregar a negociação.');
			loading = false;
			return;
		}

		if (!data) {
			errorMessage = 'Negociação não encontrada ou sem permissão de leitura.';
			loading = false;
			return;
		}

		if (data.client_id !== user.id && data.provider_id !== user.id) {
			errorMessage = 'Você não tem acesso a esta negociação.';
			loading = false;
			return;
		}

		const enriched = await enrichNegotiation(data);
		negotiation = enriched;
		editPrice = formatCurrency(enriched.proposed_price);
		editStart = enriched.proposed_start_date?.split('T')[0] ?? '';
		editEnd = enriched.proposed_end_date?.split('T')[0] ?? '';

		linkedBooking = await findBookingForNegotiation(enriched);

		loading = false;
	}

	$effect(() => {
		loadNegotiation();
	});

	async function markInNegotiation() {
		if (!negotiation || negotiation.status !== 'solicitada') return;

		await supabase
			.from('negotiations')
			.update({
				status: 'em_negociacao',
				updated_at: new Date().toISOString()
			})
			.eq('id', negotiation.id);

		negotiation = { ...negotiation, status: 'em_negociacao' };
	}

	async function handleProviderMessage() {
		await markInNegotiation();
	}

	function resolveBookingIdFromRpc(data) {
		if (!data) return null;
		if (typeof data === 'string') return data;
		if (typeof data === 'object' && data.id) return data.id;
		return String(data);
	}

	$effect(() => {
		const id = negotiationId;
		if (!id) return;

		// aceitar muda o status da negociação: o reload já encontra a operação criada
		return watchChanges(
			`negotiation-status-${id}`,
			[{ event: 'UPDATE', schema: 'public', table: 'negotiations', filter: `id=eq.${id}` }],
			() => loadNegotiation({ silent: true })
		);
	});

	async function saveProposalEdits() {
		if (!negotiation || !isProvider || !canManage) return;

		const proposed_price = parseCurrencyToNumber(editPrice);
		if (proposed_price === null) {
			errorMessage = 'Informe um valor válido para a proposta.';
			return;
		}

		actionLoading = true;
		const { error } = await supabase
			.from('negotiations')
			.update({
				proposed_price,
				proposed_start_date: editStart || null,
				proposed_end_date: editEnd || null,
				status: 'em_negociacao',
				updated_at: new Date().toISOString()
			})
			.eq('id', negotiation.id);

		if (error) {
			trackError('proposta_alteracao_falhou', error);
			errorMessage = userMessage(error, 'Não foi possível concluir a ação. Tente novamente.');
		} else {
			track('proposta_alterada');
			await loadNegotiation();
		}
		actionLoading = false;
	}

	async function confirmAccept() {
		if (!negotiation || !isProvider) return;

		actionLoading = true;
		const { data, error } = await supabase.rpc('aceitar_negociacao', {
			neg_id: negotiation.id
		});

		if (error) {
			trackError('proposta_aceite_falhou', error);
			errorMessage = userMessage(error, 'Não foi possível aceitar a proposta.');
			actionLoading = false;
			showAcceptDialog = false;
			return;
		}

		const newBookingId = resolveBookingIdFromRpc(data);
		if (!newBookingId) {
			errorMessage = 'Proposta aceita, mas o contrato não foi retornado pela API.';
			actionLoading = false;
			showAcceptDialog = false;
			return;
		}

		showAcceptDialog = false;
		actionLoading = false;
		track('proposta_aceita');
		showToast('Proposta aceita. Contrato criado com sucesso.');
		await goto(resolve(`/operacoes/${newBookingId}`));
	}

	async function confirmReject() {
		if (!negotiation || !isProvider) return;

		actionLoading = true;
		const { error } = await supabase
			.from('negotiations')
			.update({
				status: 'recusada',
				updated_at: new Date().toISOString()
			})
			.eq('id', negotiation.id);

		actionLoading = false;
		showRejectDialog = false;

		if (error) {
			trackError('proposta_recusa_falhou', error);
			errorMessage = userMessage(error, 'Não foi possível concluir a ação. Tente novamente.');
		} else {
			track('proposta_recusada');
			await loadNegotiation();
		}
	}

</script>

<svelte:head>
	<title>Negociação — Osiris</title>
</svelte:head>

{#snippet statusBadge()}
	<span
		class="badge shrink-0 gap-1.5 rounded-full px-2.5 py-1 uppercase text-xs font-bold tracking-wide {statusBadgeClass(
			negotiationStatusTone(negotiation.status)
		)}"
	>
		<span class="h-1.5 w-1.5 rounded-full bg-current"></span>
		{negotiationStatusLabel(negotiation.status)}
	</span>
{/snippet}

{#snippet decisionButtons()}
	<div class="grid grid-cols-2 gap-3">
		<button
			type="button"
			onclick={openReject}
			disabled={actionLoading}
			class="btn btn-lg preset-tonal-error w-full"
		>
			<XCircle size={18} />
			<span>Recusar</span>
		</button>
		<button
			type="button"
			onclick={openAccept}
			disabled={actionLoading}
			class="btn btn-lg preset-filled-primary-500 w-full"
		>
			<CheckCircle2 size={18} />
			<span>Aceitar</span>
		</button>
	</div>
{/snippet}

<!-- detalhes completos: coluna da esquerda no computador, gaveta no celular -->
{#snippet details(idPrefix)}
	<div class="space-y-4">
		{#if negotiation.status === 'aceita'}
			<div class="flex items-center gap-3 rounded-container preset-tonal-success p-4">
				<CheckCircle2 class="h-8 w-8 shrink-0" />
				<div class="min-w-0 flex-1">
					<p class="preset-typo-label text-inherit">Negociação concluída</p>
					<p class="text-base font-bold">Proposta aceita</p>
				</div>
			</div>
		{/if}

		<section class="space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
			{#if negotiation.coverUrl}
				<img
					src={negotiation.coverUrl}
					alt={resolveListingTitle(negotiation)}
					class="aspect-[16/9] w-full rounded-container object-cover"
				/>
			{/if}

		<!-- cabeçalho da proposta -->
		<header class="space-y-3">
			<div class="flex items-center justify-between gap-3">
				<p class="preset-typo-label text-primary-700-300">
					{isProvider ? 'Proposta recebida' : 'Proposta enviada'}
				</p>
				{@render statusBadge()}
			</div>

			{#if listingHref(negotiation)}
				<a
					href={resolve(listingHref(negotiation))}
					class="block preset-typo-headline hover:text-primary-700-300"
				>
					{resolveListingTitle(negotiation)}
				</a>
			{:else}
				<p class="preset-typo-headline">{resolveListingTitle(negotiation)}</p>
			{/if}

			<div class="flex items-center gap-3">
				{#if counterpartyPhoto() && counterpartyPhoto() !== failedPhoto}
					<img
						src={counterpartyPhoto()}
						alt={counterpartyName()}
						class="h-12 w-12 shrink-0 rounded-full object-cover"
						onerror={() => (failedPhoto = counterpartyPhoto())}
					/>
				{:else}
					<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full preset-tonal-primary text-lg font-bold">
						{counterpartyName().slice(0, 1).toUpperCase()}
					</span>
				{/if}
				<div class="min-w-0">
					<p class="preset-typo-caption">{isProvider ? 'Cliente' : 'Anunciante'}</p>
					<p class="truncate text-base font-semibold text-surface-950-50">{counterpartyName()}</p>
				</div>
			</div>
		</header>

		<!-- valor e condições -->
		<section class="overflow-hidden rounded-container border border-primary-500/20 bg-primary-500/5" aria-label="Valor proposto">
			<div class="p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="preset-typo-label">Valor proposto</p>
					{#if unitPriceLabel}
						<span class="badge rounded-full preset-tonal-primary px-2.5 py-1 text-xs font-semibold">{unitPriceLabel}</span>
					{/if}
				</div>
				<p class="mt-1 text-3xl font-bold leading-tight text-primary-700-300">
					{formatCurrency(negotiation.proposed_price)}
				</p>
			</div>

			{#if proposalQuantity || negotiation.proposed_start_date}
				<dl class="divide-y divide-primary-500/15 border-t border-primary-500/15 text-sm">
					{#if proposalQuantity}
						<div class="flex items-center justify-between gap-3 px-4 py-3">
							<dt class="flex items-center gap-2 text-surface-800-200">
								<Package class="h-4 w-4 shrink-0" />
								Quantidade solicitada
							</dt>
							<dd class="text-right font-bold text-surface-950-50">{proposalQuantity}</dd>
						</div>
					{/if}
					{#if negotiation.proposed_start_date}
						<div class="flex items-center justify-between gap-3 px-4 py-3">
							<dt class="flex items-center gap-2 text-surface-800-200">
								<CalendarDays class="h-4 w-4 shrink-0" />
								Período
							</dt>
							<dd class="text-right font-bold text-surface-950-50">
								{formatDbDate(negotiation.proposed_start_date)} a {formatDbDate(negotiation.proposed_end_date)}
							</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</section>

		<!-- mensagem enviada com a proposta -->
		{#if proposalMessage && canManage}
			<figure class="rounded-container bg-surface-100-900 p-4">
				<div class="flex gap-3">
					<Quote class="h-6 w-6 shrink-0 fill-current text-primary-500/60" />
					<blockquote class="min-w-0 whitespace-pre-wrap text-base italic text-surface-950-50 [overflow-wrap:anywhere]">
						“{proposalMessage}”
					</blockquote>
				</div>
				{#if proposalSentLabel}
					<figcaption class="mt-2 pl-9 preset-typo-caption">{proposalSentLabel}</figcaption>
				{/if}
			</figure>
		{/if}

		{#if negotiation.status === 'aceita' && linkedBooking}
			<a
				href={resolve(`/operacoes/${linkedBooking.id}`)}
				class="btn btn-lg preset-filled-primary-500 w-full"
			>
				<span>Ver operação</span>
				<ArrowRight size={18} />
			</a>
		{/if}

		</section>

		{#if isProvider && canManage}
			<section class="space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm" aria-labelledby="{idPrefix}-ajustar">
				<div class="flex items-start gap-3">
					<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container preset-tonal-surface">
						<SlidersHorizontal class="h-5 w-5" />
					</span>
					<div>
						<h2 id="{idPrefix}-ajustar" class="preset-typo-title">Ajustar termos</h2>
						<p class="preset-typo-subtitle">Altere o valor ou as datas da proposta.</p>
					</div>
				</div>
				<div>
					<label class="mb-1 block preset-typo-label" for="{idPrefix}-edit-price">Valor (R$)</label>
					<input
						id="{idPrefix}-edit-price"
						type="text"
						inputmode="decimal"
						bind:value={editPrice}
						class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base font-semibold"
						placeholder="Ex: 2.000,00"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="mb-1 block preset-typo-label" for="{idPrefix}-edit-start">Início</label>
						<input
							id="{idPrefix}-edit-start"
							type="date"
							bind:value={editStart}
							class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-sm"
						/>
					</div>
					<div>
						<label class="mb-1 block preset-typo-label" for="{idPrefix}-edit-end">Término</label>
						<input
							id="{idPrefix}-edit-end"
							type="date"
							bind:value={editEnd}
							class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-sm"
						/>
					</div>
				</div>
				<button
					type="button"
					onclick={saveProposalEdits}
					disabled={actionLoading}
					class="btn btn-lg preset-tonal-primary w-full"
				>
					<Check size={18} />
					<span>Salvar ajustes</span>
				</button>
			</section>

			{@render decisionButtons()}
		{/if}
	</div>
{/snippet}

<!--
	Celular: a tela inteira é do chat (altura da janela, sem a barra inferior),
	com um resumo da proposta no topo e os detalhes numa gaveta.
	Computador (md+): duas colunas, detalhes à esquerda e chat à direita.
-->
<div class="flex h-dvh flex-col md:block md:h-auto md:min-h-screen md:pb-24 lg:pb-0">
	<Header title="Negociação" backHref="/negociacoes" />

	<main class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col md:block md:px-4 md:py-4 lg:max-w-6xl lg:px-8 lg:py-6">
		{#if loading}
			<div class="space-y-4 p-4 md:p-0" role="status" aria-live="polite">
				<span class="sr-only">Carregando negociação...</span>
				<div class="placeholder h-24 w-full animate-pulse rounded-container"></div>
				<div class="placeholder h-64 w-full animate-pulse rounded-container"></div>
			</div>
		{:else if errorMessage && !negotiation}
			<div class="m-4 flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm md:m-0">
				<CircleAlert class="h-5 w-5 shrink-0" />
				{errorMessage}
			</div>
		{:else if negotiation}
			<h1 class="sr-only">Negociação: {resolveListingTitle(negotiation)}</h1>

			<nav class="mb-4 hidden min-w-0 items-center gap-1.5 text-sm lg:flex" aria-label="Caminho">
				<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
					<Home size={16} />
					Início
				</a>
				<span class="text-surface-700-300">/</span>
				<a href={resolve('/negociacoes')} class="text-surface-800-200 hover:text-primary-700-300">Negociações</a>
				<span class="text-surface-700-300">/</span>
				<span class="truncate font-semibold text-surface-950-50" aria-current="page">{resolveListingTitle(negotiation)}</span>
			</nav>

			{#if errorMessage}
				<div class="mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-container preset-tonal-error p-3 text-sm md:mx-0 md:mb-3 md:mt-0">
					<CircleAlert class="h-5 w-5 shrink-0" />
					{errorMessage}
				</div>
			{/if}

			<!-- resumo da proposta (só no celular) -->
			<section class="shrink-0 border-b border-surface-200-800 bg-surface-50-950 px-4 py-3 md:hidden" aria-label="Resumo da proposta">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-container preset-tonal-primary">
						{#if negotiation.coverUrl}
							<img src={negotiation.coverUrl} alt="" class="h-full w-full object-cover" />
						{:else}
							<span class="text-lg font-bold">{counterpartyName().slice(0, 1).toUpperCase()}</span>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate preset-typo-card-title">{resolveListingTitle(negotiation)}</p>
						<p class="truncate text-sm text-surface-800-200">
							<span class="font-bold text-primary-700-300">{formatCurrency(negotiation.proposed_price)}</span>
							{#if negotiation.proposed_start_date}
								· {formatDbDate(negotiation.proposed_start_date)} a {formatDbDate(negotiation.proposed_end_date)}
							{/if}
						</p>
						<p class="truncate text-xs text-surface-800-200">
							{isProvider ? 'Cliente' : 'Anunciante'}: <span class="font-semibold">{counterpartyName()}</span>
						</p>
					</div>
					{@render statusBadge()}
				</div>

				<div class="mt-3 flex gap-2">
					<button type="button" onclick={() => (detailsOpen = true)} class="btn preset-tonal min-w-0 flex-1">
						<FileText size={18} />
						<span class="truncate">Detalhes</span>
					</button>
					{#if isProvider && canManage}
						<button
							type="button"
							onclick={openAccept}
							disabled={actionLoading}
							class="btn preset-filled-primary-500 min-w-0 flex-1"
						>
							<CheckCircle2 size={18} />
							<span class="truncate">Aceitar</span>
						</button>
					{:else if negotiation.status === 'aceita' && linkedBooking}
						<a href={resolve(`/operacoes/${linkedBooking.id}`)} class="btn preset-filled-primary-500 flex-1">
							<span>Ver operação</span>
							<ArrowRight size={18} />
						</a>
					{/if}
				</div>
			</section>

			<div class="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:items-start md:gap-4 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-6">
				<aside class="hidden md:block lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1" aria-label="Detalhes da proposta">
					{@render details('lado')}
				</aside>

				<section
					class="flex min-h-0 flex-1 flex-col md:block md:rounded-container md:border md:border-surface-200-800 md:bg-surface-50-950 md:p-4 md:shadow-sm lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-8rem)] lg:flex-col"
					aria-label="Conversa"
				>
					<h2 class="mb-3 hidden items-center gap-2 preset-typo-title md:flex">
						<MessagesSquare class="h-5 w-5 text-primary-700-300" />
						Conversa com {isProvider ? 'o cliente' : 'o anunciante'}
					</h2>
					<NegotiationChat
						negotiationId={negotiation.id}
						currentUserId={authUserId}
						providerId={negotiation.provider_id}
						disabled={chatDisabled}
						onProviderMessage={handleProviderMessage}
						fillOnMobile
					/>
				</section>
			</div>
		{/if}
	</main>

	{#if negotiation}
		<AppDialog bind:open={detailsOpen} title="Detalhes da proposta" variant="sheet" size="md" closeLabel="Fechar detalhes">
			{@render details('gaveta')}
		</AppDialog>
	{/if}

	<AppConfirmDialog
		bind:open={showAcceptDialog}
		title="Aceitar proposta?"
		message="Será criado um contrato ativo (agendamento) com os valores e datas acordados. Esta ação encerra a fase de proposta."
		confirmLabel="Aceitar proposta"
		variant="default"
		loading={actionLoading}
		onconfirm={confirmAccept}
		oncancel={() => (showAcceptDialog = false)}
	/>

	<AppConfirmDialog
		bind:open={showRejectDialog}
		title="Recusar proposta?"
		message="O cliente será informado e o chat será encerrado."
		confirmLabel="Recusar"
		variant="danger"
		loading={actionLoading}
		onconfirm={confirmReject}
		oncancel={() => (showRejectDialog = false)}
	/>

	<!-- no celular a barra inferior sai para o chat ter a tela toda; voltar fica no cabeçalho -->
	<div class="hidden md:block">
		<BottomNav active="mais" />
	</div>
</div>
