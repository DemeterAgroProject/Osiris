<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, Play, Flag, Star, CheckCircle2 } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
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

	let loading = $state(true);
	let authUserId = $state(null);
	let booking = $state(null);
	let reviews = $state([]);
	let errorMessage = $state('');
	let actionLoading = $state(false);
	let showCancelDialog = $state(false);
	let rating = $state(5);
	let comment = $state('');
	let reviewSubmitting = $state(false);

	const bookingId = $derived(page.params.id);
	const isProvider = $derived(authUserId && booking?.provider_id === authUserId);
	const myReview = $derived(reviews.find((r) => r.reviewer_id === authUserId));
	const revieweeId = $derived(isProvider ? booking?.client_id : booking?.provider_id);
	const canReview = $derived(booking?.status === 'em_avaliacao' && !myReview);
	const bothReviewed = $derived(
		booking &&
			reviews.some((r) => r.reviewer_id === booking.client_id) &&
			reviews.some((r) => r.reviewer_id === booking.provider_id)
	);
	const canManualFinalize = $derived(booking?.status === 'em_avaliacao');

	function statusBadgeClass(tone) {
		const map = {
			amber: 'bg-amber-100 text-amber-800',
			blue: 'bg-blue-100 text-blue-800',
			green: 'bg-green-100 text-green-800',
			emerald: 'bg-emerald-100 text-emerald-800',
			red: 'bg-red-100 text-red-800',
			gray: 'bg-gray-100 text-gray-700'
		};
		return map[tone] ?? map.gray;
	}

	function listingTitle() {
		return booking?.products?.name || booking?.services?.title || 'Operação';
	}

	async function fetchProfileBrief(profileId) {
		if (!profileId) return null;
		const { data } = await supabase
			.from('profiles')
			.select('display_name, full_name')
			.eq('id', profileId)
			.maybeSingle();
		return data;
	}

	async function enrichBooking(row) {
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

	async function loadBooking(id) {
		if (!id) {
			errorMessage = 'Identificador da operação inválido.';
			booking = null;
			loading = false;
			return;
		}

		loading = true;
		errorMessage = '';
		booking = null;
		reviews = [];

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(`/login?redirect=/operacoes/${id}`);
			return;
		}

		authUserId = user.id;

		const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();

		if (error) {
			console.error('Erro ao carregar operação:', error);
			errorMessage = error.message || 'Erro ao carregar a operação.';
			loading = false;
			return;
		}

		if (!data) {
			errorMessage = 'Operação não encontrada ou sem permissão de leitura.';
			loading = false;
			return;
		}

		if (data.client_id !== user.id && data.provider_id !== user.id) {
			errorMessage = 'Você não tem acesso a esta operação.';
			loading = false;
			return;
		}

		booking = await enrichBooking(data);

		const { data: reviewRows, error: reviewsError } = await supabase
			.from('reviews')
			.select('id, reviewer_id, reviewee_id, rating, comment, created_at')
			.eq('booking_id', id);

		if (reviewsError) {
			console.error('Erro ao carregar avaliações:', reviewsError);
		}

		reviews = reviewRows ?? [];
		loading = false;
	}

	$effect(() => {
		loadBooking(bookingId);
	});

	async function updateBookingStatus(newStatus) {
		const id = bookingId;
		if (!id) return;

		actionLoading = true;
		const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);

		actionLoading = false;

		if (error) {
			errorMessage = error.message;
		} else {
			await loadBooking(id);
		}
	}

	async function tryFinalizeAfterReviews() {
		if (!booking || booking.status !== 'em_avaliacao') return;

		const distinctReviewers = new Set(reviews.map((r) => r.reviewer_id));
		if (
			distinctReviewers.has(booking.client_id) &&
			distinctReviewers.has(booking.provider_id)
		) {
			await updateBookingStatus('finalizada');
		}
	}

	async function submitReview() {
		const id = bookingId;
		if (!canReview || !revieweeId || !id) return;

		reviewSubmitting = true;
		const { error } = await supabase.from('reviews').insert({
			booking_id: id,
			reviewer_id: authUserId,
			reviewee_id: revieweeId,
			rating,
			comment: comment.trim() || null
		});

		reviewSubmitting = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		comment = '';
		await loadBooking(id);
		await tryFinalizeAfterReviews();
	}

	async function confirmCancel() {
		showCancelDialog = false;
		await updateBookingStatus('cancelado');
	}
</script>

<svelte:head>
	<title>Operação — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<a
			href="/negociacoes"
			class="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-green-700"
		>
			<ChevronLeft class="h-4 w-4" />
			Negociações
		</a>

		{#if loading}
			<div class="flex justify-center py-16">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
				></div>
			</div>
		{:else if errorMessage && !booking}
			<div class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if booking}
			<div class="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h1 class="text-xl font-bold text-gray-900">{listingTitle()}</h1>
						<p class="mt-1 text-sm text-gray-500">
							{isProvider ? 'Cliente' : 'Provedor'}:
							{isProvider
								? booking.client?.display_name || booking.client?.full_name
								: booking.provider?.display_name || booking.provider?.full_name}
						</p>
					</div>
					<span
						class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase {statusBadgeClass(
							bookingStatusTone(booking.status)
						)}"
					>
						{bookingStatusLabel(booking.status)}
					</span>
				</div>

				<dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
					<div>
						<dt class="text-xs text-gray-400">Valor acordado</dt>
						<dd class="font-semibold text-green-700">{formatCurrency(booking.total_price)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-xs text-gray-400">Período</dt>
						<dd class="font-medium text-gray-800">
							{formatDbDate(booking.start_date)} — {formatDbDate(booking.end_date)}
						</dd>
					</div>
				</dl>
			</div>

			{#if errorMessage}
				<p class="mt-3 text-sm text-red-600">{errorMessage}</p>
			{/if}

			{#if isProvider}
				<div class="mt-4 space-y-2">
					{#if booking.status === 'pendente'}
						<button
							type="button"
							onclick={() => updateBookingStatus('em_operacao')}
							disabled={actionLoading}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
						>
							<Play class="h-4 w-4" />
							Iniciar operação em campo
						</button>
					{/if}

					{#if booking.status === 'em_operacao'}
						<button
							type="button"
							onclick={() => updateBookingStatus('em_avaliacao')}
							disabled={actionLoading}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
						>
							<Flag class="h-4 w-4" />
							Encerrar operação
						</button>
					{/if}

					{#if !['finalizada', 'cancelado', 'bloqueado_prestador', 'em_avaliacao'].includes(
						booking.status
					)}
						<button
							type="button"
							onclick={() => (showCancelDialog = true)}
							class="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
						>
							Cancelar operação
						</button>
					{/if}
				</div>
			{:else if booking.status === 'pendente'}
				<p class="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
					Aguardando o provedor iniciar a operação em campo.
				</p>
			{:else if booking.status === 'em_operacao'}
				<p class="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
					Operação em andamento no campo.
				</p>
			{/if}

			{#if booking.status === 'em_avaliacao'}
				<section class="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<h2 class="flex items-center gap-2 text-sm font-bold text-gray-900">
						<Star class="h-4 w-4 text-amber-500" />
						Avaliar experiência
					</h2>

					{#if myReview}
						<p class="mt-3 text-sm text-gray-600">
							Você já enviou sua avaliação ({myReview.rating}/5).
						</p>
					{:else if canReview}
						<div class="mt-3 flex gap-1">
							{#each [1, 2, 3, 4, 5] as star}
								<button
									type="button"
									onclick={() => (rating = star)}
									class="rounded p-1 {rating >= star
										? 'text-amber-500'
										: 'text-gray-300'}"
									aria-label="{star} estrelas"
								>
									<Star class="h-7 w-7 {rating >= star ? 'fill-current' : ''}" />
								</button>
							{/each}
						</div>
						<textarea
							rows="3"
							bind:value={comment}
							placeholder="Comentário opcional..."
							class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
						></textarea>
						<button
							type="button"
							onclick={submitReview}
							disabled={reviewSubmitting}
							class="mt-3 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
						>
							{reviewSubmitting ? 'Enviando...' : 'Enviar avaliação'}
						</button>
					{/if}

					<p class="mt-3 text-xs text-gray-400">
						A operação será finalizada automaticamente quando cliente e provedor avaliarem.
					</p>

					{#if canManualFinalize}
						<button
							type="button"
							onclick={() => updateBookingStatus('finalizada')}
							disabled={actionLoading}
							class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
						>
							<CheckCircle2 class="h-4 w-4" />
							Encerrar operação manualmente
						</button>
					{/if}
				</section>
			{/if}

			{#if booking.status === 'finalizada'}
				<div class="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
					{#if bothReviewed}
						Operação finalizada. Obrigado por usar o Osiris.
					{:else}
						Operação encerrada.
					{/if}
				</div>
			{/if}
		{/if}
	</main>

	<ConfirmDialog
		bind:open={showCancelDialog}
		title="Cancelar operação?"
		message="As datas serão liberadas e a operação não poderá ser retomada."
		confirmLabel="Cancelar operação"
		variant="danger"
		loading={actionLoading}
		onconfirm={confirmCancel}
		oncancel={() => (showCancelDialog = false)}
	/>

	<BottomNav active="mais" />
</div>