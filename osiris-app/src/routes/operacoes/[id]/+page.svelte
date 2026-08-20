<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, Play, Flag, Star, CheckCircle2, X } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
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
	let cancellationReason = $state('');
	let cancellationReasonDetails = $state('');
	let rating = $state(5);
	let comment = $state('');
	let reviewSubmitting = $state(false);

	const cancellationReasons = [
		{ value: 'mechanical_issue', label: 'Problema mecanico' },
		{ value: 'weather_conditions', label: 'Condicoes climaticas' },
		{ value: 'logistical_issue', label: 'Falha logistica / Transporte' },
		{ value: 'operational_unavailability', label: 'Indisponibilidade operacional' },
		{ value: 'commercial_disagreement', label: 'Desacordo comercial' },
		{ value: 'withdrawal', label: 'Desistencia' },
		{ value: 'other', label: 'Outro' }
	];

	const bookingId = $derived(page.params.id);
	const isProvider = $derived(authUserId && booking?.provider_id === authUserId);
	const myReview = $derived(reviews.find((r) => r.reviewer_id === authUserId));
	const revieweeId = $derived(isProvider ? booking?.client_id : booking?.provider_id);
	const canReview = $derived(['em_avaliacao', 'cancelado'].includes(booking?.status) && !myReview);
	const canCancelBooking = $derived(
		booking &&
			authUserId &&
			[booking.client_id, booking.provider_id].includes(authUserId) &&
			['pendente', 'em_operacao'].includes(booking.status)
	);
	const bothReviewed = $derived(
		booking &&
			reviews.some((r) => r.reviewer_id === booking.client_id) &&
			reviews.some((r) => r.reviewer_id === booking.provider_id)
	);
	const canManualFinalize = $derived(booking?.status === 'em_avaliacao');

	function statusBadgeClass(tone) {
		const map = {
			amber: 'preset-tonal-warning',
			blue: 'preset-tonal-secondary',
			green: 'preset-tonal-primary',
			emerald: 'preset-tonal-primary',
			red: 'preset-tonal-error',
			gray: 'preset-tonal-surface'
		};
		return map[tone] ?? map.gray;
	}

	function listingTitle() {
		return booking?.products?.name || booking?.services?.title || 'Operação';
	}

	function listingHref() {
		if (!booking) return null;
		if (booking.service_id) return `/anuncio/servico/${booking.service_id}`;
		if (booking.product_id) {
			return booking.products?.category === 'Maquinário'
				? `/anuncio/maquinario/${booking.product_id}`
				: `/anuncio/produto/${booking.product_id}`;
		}
		return null;
	}

	function cancellationReasonLabel(reason) {
		return cancellationReasons.find((item) => item.value === reason)?.label ?? reason ?? 'Nao informado';
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

	function counterpartyName() {
		if (!booking) return '—';
		const profile = isProvider ? booking.client : booking.provider;
		return profile?.display_name || (isProvider ? 'Cliente' : 'Provedor');
	}

	function counterpartyPhoto() {
		if (!booking) return null;
		const profile = isProvider ? booking.client : booking.provider;
		return profile?.photo_url || null;
	}

	async function fetchProfileBrief(profileId) {
		if (!profileId) return null;
		const { data } = await supabase
			.from('profiles')
			.select('id, display_name, photo_url')
			.eq('id', profileId)
			.maybeSingle();
		return data;
	}

	async function enrichReviews(reviewRows) {
		const rows = reviewRows ?? [];
		if (!rows.length) return [];

		const reviewerIds = [...new Set(rows.map((row) => row.reviewer_id).filter(Boolean))];
		let profilesById = {};

		if (reviewerIds.length) {
			const { data } = await supabase
				.from('profiles')
				.select('id, display_name, photo_url')
				.in('id', reviewerIds);

			profilesById = Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]));
		}

		return rows.map((row) => ({
			...row,
			reviewerName: profilesById[row.reviewer_id]?.display_name || 'Usuário',
			reviewerPhoto: profilesById[row.reviewer_id]?.photo_url || null
		}));
	}

	async function enrichBooking(row) {
		const [products, services, client, provider, coverUrl] = await Promise.all([
			row.product_id
				? supabase
						.from('products')
						.select('id, name, category')
						.eq('id', row.product_id)
						.maybeSingle()
						.then((r) => r.data)
				: null,
			row.service_id
				? supabase
						.from('services')
						.select('id, title')
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

		reviews = await enrichReviews(reviewRows ?? []);
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

	function openCancelDialog() {
		cancellationReason = '';
		cancellationReasonDetails = '';
		showCancelDialog = true;
	}

	function closeCancelDialog() {
		if (actionLoading) return;
		showCancelDialog = false;
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
		const id = bookingId;
		if (!id) return;

		errorMessage = '';

		if (!cancellationReason) {
			errorMessage = 'Selecione o motivo do cancelamento.';
			return;
		}

		if (
			cancellationReason === 'other' &&
			cancellationReasonDetails.trim().length < 15
		) {
			errorMessage = 'Descreva o motivo com pelo menos 15 caracteres.';
			return;
		}

		actionLoading = true;
		const { error } = await supabase.rpc('cancel_booking', {
			p_booking_id: id,
			p_cancellation_reason: cancellationReason,
			p_cancellation_reason_details:
				cancellationReason === 'other' ? cancellationReasonDetails.trim() : null
		});

		actionLoading = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		showCancelDialog = false;
		await loadBooking(id);
	}
</script>

<svelte:head>
	<title>Operação — Osiris</title>
</svelte:head>

<div class="min-h-screen bg-surface-50-950 pb-24 lg:pb-0">
	<Header />

	<main class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
		<a
			href="/negociacoes"
			class="btn btn-sm preset-outlined-surface-500 text-surface-800-200"
			aria-label="Voltar para negociações"
		>
			<ChevronLeft class="h-4 w-4" aria-hidden="true" />
			Negociações
		</a>

		{#if loading}
			<div class="flex justify-center py-16">
				<LoadingIndicator label="Carregando operação..." />
			</div>
		{:else if errorMessage && !booking}
			<div class="mt-4 rounded-container preset-tonal-error p-4 text-sm">{errorMessage}</div>
		{:else if booking}
			<div class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 ">
				{#if booking.coverUrl}
					<img
						src={booking.coverUrl}
						alt={listingTitle()}
						class="mb-4 aspect-[16/10] w-full rounded-container object-cover"
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
							{#if listingHref()}
								<a href={listingHref()} class="text-xl font-bold text-surface-950-50 hover:text-primary-700">
									{listingTitle()}
								</a>
							{:else}
								<h1 class="text-xl font-bold text-surface-950-50">{listingTitle()}</h1>
							{/if}
							<p class="mt-1 text-sm text-surface-700-300">
								{isProvider ? 'Cliente' : 'Provedor'}: {counterpartyName()}
							</p>
						</div>
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
						<dt class="text-xs text-surface-700-300">Valor acordado</dt>
						<dd class="font-semibold text-primary-700">{formatCurrency(booking.total_price)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-xs text-surface-700-300">Período</dt>
						<dd class="font-medium text-surface-950-50">
							{formatDbDate(booking.start_date)} — {formatDbDate(booking.end_date)}
						</dd>
					</div>
				</dl>

				{#if booking.status === 'cancelado'}
					<div class="mt-4 rounded-container preset-tonal-error p-3 text-sm">
						<p class="font-semibold text-surface-950-50">
							Motivo: {cancellationReasonLabel(booking.cancellation_reason)}
						</p>
						{#if booking.cancellation_reason_details}
							<p class="mt-1 text-surface-700-300">{booking.cancellation_reason_details}</p>
						{/if}
						{#if booking.cancelled_at}
							<p class="mt-2 text-xs text-surface-700-300">
								Cancelado em {formatDbDate(booking.cancelled_at)}
							</p>
						{/if}
					</div>
				{/if}
			</div>

			{#if errorMessage}
				<p class="mt-3 text-sm text-error-500">{errorMessage}</p>
			{/if}

			{#if isProvider}
				<div class="mt-4 space-y-2">
					{#if booking.status === 'pendente'}
						<button
							type="button"
							onclick={() => updateBookingStatus('em_operacao')}
							disabled={actionLoading}
							class="flex w-full items-center justify-center gap-2 rounded-container preset-filled-primary-500 py-3.5 text-sm font-semibold disabled:opacity-60"
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
							class="flex w-full items-center justify-center gap-2 rounded-container preset-filled-secondary-500 py-3.5 text-sm font-semibold disabled:opacity-60"
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
							onclick={openCancelDialog}
							class="w-full rounded-container border border-error-500 py-2.5 text-sm font-semibold text-error-500 hover:preset-tonal-error"
						>
							Cancelar operação
						</button>
					{/if}
				</div>
			{:else if booking.status === 'pendente'}
				<p class="mt-4 rounded-container preset-tonal-warning p-3 text-sm">
					Aguardando o provedor iniciar a operação em campo.
				</p>
			{:else if booking.status === 'em_operacao'}
				<p class="mt-4 rounded-container preset-tonal-primary p-3 text-sm">
					Operação em andamento no campo.
				</p>
			{/if}

			{#if canCancelBooking && !isProvider}
				<button
					type="button"
					onclick={openCancelDialog}
					disabled={actionLoading}
					class="mt-4 w-full rounded-container border border-error-500 py-2.5 text-sm font-semibold text-error-500 hover:preset-tonal-error disabled:opacity-60"
				>
					Cancelar operaÃ§Ã£o
				</button>
			{/if}

			{#if booking.status === 'em_avaliacao' || booking.status === 'cancelado'}
				<section class="mt-6 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 ">
					<h2 class="flex items-center gap-2 text-sm font-bold text-surface-950-50">
						<Star class="h-4 w-4 text-warning-500" />
						Avaliar experiência
					</h2>

					{#if myReview}
						<p class="mt-3 text-sm text-surface-700-300">
							Você já enviou sua avaliação ({myReview.rating}/5).
						</p>
					{:else if canReview}
						<div class="mt-3">
							<Rating
								bind:value={rating}
								readOnly={false}
								allowHalf={false}
								count={0}
								size="lg"
								showCount={false}
								showValue={false}
							/>
						</div>
						<textarea
							rows="3"
							bind:value={comment}
							placeholder="Comentário opcional..."
							class="textarea mt-3 w-full rounded-container border border-surface-200-800 px-3 py-2.5 text-sm"
						></textarea>
						<button
							type="button"
							onclick={submitReview}
							disabled={reviewSubmitting}
							class="mt-3 w-full rounded-container preset-filled-primary-500 py-3 text-sm font-semibold disabled:opacity-60"
						>
							{reviewSubmitting ? 'Enviando...' : 'Enviar avaliação'}
						</button>
					{/if}

					<p class="mt-3 text-xs text-surface-700-300">
						{booking.status === 'cancelado'
							? 'A avaliação ficará vinculada à operação cancelada para registrar a experiência.'
							: 'A operação será finalizada automaticamente quando cliente e provedor avaliarem.'}
					</p>

					{#if canManualFinalize}
						<button
							type="button"
							onclick={() => updateBookingStatus('finalizada')}
							disabled={actionLoading}
							class="mt-4 flex w-full items-center justify-center gap-2 rounded-container border border-surface-200-800 py-2.5 text-sm font-semibold text-surface-700-300 hover:preset-tonal disabled:opacity-60"
						>
							<CheckCircle2 class="h-4 w-4" />
							Encerrar operação manualmente
						</button>
					{/if}
				</section>
			{/if}

			{#if booking.status === 'finalizada'}
				<div class="mt-4 rounded-container preset-tonal-primary p-4 text-sm">
					{#if bothReviewed}
						Operação finalizada. Obrigado por usar o Osiris.
					{:else}
						Operação encerrada.
					{/if}
				</div>
			{/if}

			{#if reviews.length}
				<section class="mt-6 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 ">
					<h2 class="text-sm font-bold text-surface-950-50">Avaliações desta operação</h2>
					<ul class="mt-3 space-y-3">
						{#each reviews as review (review.id)}
							<li class="rounded-container bg-surface-50-950 p-3">
								<div class="flex items-center gap-2">
									{#if review.reviewerPhoto}
										<img
											src={review.reviewerPhoto}
											alt={review.reviewerName}
											class="h-8 w-8 rounded-full object-cover"
										/>
									{/if}
									<div>
										<p class="text-sm font-medium text-surface-950-50">{review.reviewerName}</p>
										<p class="text-xs text-warning-600">{review.rating}/5</p>
									</div>
								</div>
								{#if review.comment}
									<p class="mt-2 text-sm text-surface-700-300">{review.comment}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</main>

	<Dialog
		open={showCancelDialog}
		onOpenChange={(details) => {
			if (!details.open) closeCancelDialog();
			showCancelDialog = details.open;
		}}
		closeOnEscape={!actionLoading}
		closeOnInteractOutside={!actionLoading}
		role="alertdialog"
	>
		{#if showCancelDialog}
			<Portal>
				<Dialog.Backdrop class="fixed inset-0 z-[100] bg-surface-950/60 backdrop-blur-sm" />
				<Dialog.Positioner class="fixed inset-0 z-[101] flex items-end justify-center p-4 sm:items-center">
					<Dialog.Content
						class="card w-full max-w-md rounded-container border border-surface-200-800 bg-surface-50-950 p-5"
					>
						<div class="mb-4 flex items-start justify-between gap-3">
							<div class="min-w-0">
								<Dialog.Title class="text-lg font-bold text-surface-950-50">
									Cancelar operação
								</Dialog.Title>
								<Dialog.Description class="mt-2 text-sm leading-relaxed text-surface-700-300">
									Informe o motivo. A outra parte poderá ver o cancelamento e avaliar a experiência.
								</Dialog.Description>
							</div>
							<button
								type="button"
								class="btn-icon shrink-0 rounded-full preset-tonal-surface disabled:opacity-50"
								disabled={actionLoading}
								onclick={closeCancelDialog}
								aria-label="Fechar"
							>
								<X class="h-5 w-5" />
							</button>
						</div>

						<div class="space-y-3">
							<label class="block text-sm font-medium text-surface-700-300" for="cancellation-reason">
								Motivo do cancelamento
							</label>
							<select
								id="cancellation-reason"
								bind:value={cancellationReason}
								class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-2.5 text-sm"
							>
								<option value="">Selecione um motivo</option>
								{#each cancellationReasons as reason (reason.value)}
									<option value={reason.value}>{reason.label}</option>
								{/each}
							</select>

							{#if cancellationReason === 'other'}
								<label class="block text-sm font-medium text-surface-700-300" for="cancellation-details">
									Detalhes do motivo
								</label>
								<textarea
									id="cancellation-details"
									rows="4"
									bind:value={cancellationReasonDetails}
									class="textarea w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-2.5 text-sm"
									placeholder="Descreva o motivo com pelo menos 15 caracteres"
								></textarea>
							{/if}
						</div>

						<div class="mt-5 grid grid-cols-2 gap-2">
							<button
								type="button"
								class="btn min-h-11 w-full preset-outlined-surface-500 disabled:opacity-50"
								disabled={actionLoading}
								onclick={closeCancelDialog}
							>
								Voltar
							</button>
							<button
								type="button"
								class="btn min-h-11 w-full preset-filled-error-500 font-semibold disabled:opacity-60"
								disabled={actionLoading}
								onclick={confirmCancel}
							>
								{actionLoading ? 'Cancelando...' : 'Confirmar'}
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Positioner>
			</Portal>
		{/if}
	</Dialog>

	<BottomNav active="mais" />
</div>
