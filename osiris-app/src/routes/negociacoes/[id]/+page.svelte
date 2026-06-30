<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import NegotiationChat from '$lib/components/NegotiationChat.svelte';
	import { supabase } from '$lib/supabase';

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
	let toastMessage = $state('');
	let editPrice = $state('');
	let editStart = $state('');
	let editEnd = $state('');

	const negotiationId = $derived(page.params.id);
	const isProvider = $derived(authUserId && negotiation?.provider_id === authUserId);
	const canManage = $derived(isNegotiationOpen(negotiation?.status));
	const chatDisabled = $derived(!canManage);

	function statusBadgeClass(tone) {
		const map = {
			amber: 'bg-amber-100 text-amber-800',
			blue: 'bg-blue-100 text-blue-800',
			green: 'bg-green-100 text-green-800',
			red: 'bg-red-100 text-red-800',
			gray: 'bg-gray-100 text-gray-700'
		};
		return map[tone] ?? map.gray;
	}

	function counterpartyName() {
		const profile = isProvider ? negotiation?.client : negotiation?.provider;
		return profile?.display_name || 'Participante';
	}

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
						.select('id, name, category, owner_id')
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

	async function loadNegotiation() {
		if (!negotiationId) return;

		loading = true;
		errorMessage = '';
		negotiation = null;
		linkedBooking = null;

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(`/login?redirect=/negociacoes/${negotiationId}`);
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
				error.message ||
				'Erro ao carregar a negociação. Confira as políticas RLS de SELECT no Supabase.';
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

	function showToast(message) {
		toastMessage = message;
		setTimeout(() => {
			toastMessage = '';
		}, 4000);
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

		const channel = supabase
			.channel(`negotiation-status-${id}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'negotiations',
					filter: `id=eq.${id}`
				},
				() => {
					loadNegotiation();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
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
			errorMessage = error.message;
		} else {
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
			errorMessage = error.message || 'Não foi possível aceitar a proposta.';
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
		showToast('Proposta aceita. Contrato criado com sucesso.');
		await goto(`/operacoes/${newBookingId}`);
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
			errorMessage = error.message;
		} else {
			await loadNegotiation();
		}
	}

</script>

<svelte:head>
	<title>Negociação — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<a
			href="/negociacoes"
			class="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-green-700"
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
		{:else if errorMessage && !negotiation}
			<div class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if negotiation}
			{#if errorMessage}
				<p class="mt-3 text-sm text-red-600">{errorMessage}</p>
			{/if}

			<div class="mt-4 grid gap-6 md:grid-cols-2 md:items-start">
				<div class="space-y-4">
					<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
						{#if negotiation.coverUrl}
							<img
								src={negotiation.coverUrl}
								alt={resolveListingTitle(negotiation)}
								class="mb-4 aspect-[16/10] w-full rounded-xl object-cover"
							/>
						{/if}
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-start gap-3">
								{#if counterpartyPhoto()}
									<img
										src={counterpartyPhoto()}
										alt={counterpartyName()}
										class="h-10 w-10 shrink-0 rounded-full object-cover"
									/>
								{/if}
								<div class="min-w-0">
									{#if listingHref(negotiation)}
										<a
											href={listingHref(negotiation)}
											class="text-xl font-bold text-gray-900 hover:text-green-700"
										>
											{resolveListingTitle(negotiation)}
										</a>
									{:else}
										<h1 class="text-xl font-bold text-gray-900">{resolveListingTitle(negotiation)}</h1>
									{/if}
									<p class="mt-1 text-sm text-gray-500">
										{isProvider ? 'Cliente' : 'Anunciante'}: {counterpartyName()}
									</p>
								</div>
							</div>
							<span
								class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase {statusBadgeClass(
									negotiationStatusTone(negotiation.status)
								)}"
							>
								{negotiationStatusLabel(negotiation.status)}
							</span>
						</div>

						<dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
							<div>
								<dt class="text-xs text-gray-400">Valor proposto</dt>
								<dd class="font-semibold text-green-700">
									{formatCurrency(negotiation.proposed_price)}
								</dd>
							</div>
							{#if negotiation.proposed_start_date}
								<div class="col-span-2">
									<dt class="text-xs text-gray-400">Período</dt>
									<dd class="font-medium text-gray-800">
										{formatDbDate(negotiation.proposed_start_date)} — {formatDbDate(
											negotiation.proposed_end_date
										)}
									</dd>
								</div>
							{/if}
						</dl>

						{#if negotiation.message && canManage}
							<p class="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 whitespace-pre-wrap">
								{negotiation.message}
							</p>
						{/if}
					</div>

					{#if isProvider && canManage}
						<div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
							<h2 class="text-sm font-bold text-gray-900">Ajustar termos</h2>
							<p class="mt-1 text-xs text-gray-500">Altere preço e datas da proposta.</p>
							<div class="mt-3 space-y-3">
								<input
									type="text"
									bind:value={editPrice}
									class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
									placeholder="Valor final"
								/>
								<div class="grid grid-cols-2 gap-2">
									<input
										type="date"
										bind:value={editStart}
										class="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
									/>
									<input
										type="date"
										bind:value={editEnd}
										class="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
									/>
								</div>
								<button
									type="button"
									onclick={saveProposalEdits}
									disabled={actionLoading}
									class="w-full rounded-xl border border-green-200 bg-green-50 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-60"
								>
									Salvar ajustes
								</button>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => (showRejectDialog = true)}
								disabled={actionLoading}
								class="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
							>
								<XCircle class="h-4 w-4" />
								Recusar
							</button>
							<button
								type="button"
								onclick={() => (showAcceptDialog = true)}
								disabled={actionLoading}
								class="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700"
							>
								<CheckCircle2 class="h-4 w-4" />
								Aceitar proposta
							</button>
						</div>
					{/if}

					{#if negotiation.status === 'aceita' && linkedBooking}
						<a
							href="/operacoes/{linkedBooking.id}"
							class="block rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
						>
							Ver operação
						</a>
					{/if}
				</div>

				<div>
					<h2 class="mb-2 text-sm font-bold text-gray-900">Chat</h2>
					<NegotiationChat
						negotiationId={negotiation.id}
						currentUserId={authUserId}
						providerId={negotiation.provider_id}
						disabled={chatDisabled}
						onProviderMessage={handleProviderMessage}
					/>
				</div>
			</div>
		{/if}
	</main>

	<ConfirmDialog
		bind:open={showAcceptDialog}
		title="Aceitar proposta?"
		message="Será criado um contrato ativo (agendamento) com os valores e datas acordados. Esta ação encerra a fase de proposta."
		confirmLabel="Aceitar proposta"
		variant="default"
		loading={actionLoading}
		onconfirm={confirmAccept}
		oncancel={() => (showAcceptDialog = false)}
	/>

	<ConfirmDialog
		bind:open={showRejectDialog}
		title="Recusar proposta?"
		message="O cliente será informado e o chat será encerrado."
		confirmLabel="Recusar"
		variant="danger"
		loading={actionLoading}
		onconfirm={confirmReject}
		oncancel={() => (showRejectDialog = false)}
	/>

	{#if toastMessage}
		<div
			class="fixed bottom-24 left-1/2 z-[110] max-w-sm -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
			role="status"
		>
			{toastMessage}
		</div>
	{/if}

	<BottomNav active="mais" />
</div>
