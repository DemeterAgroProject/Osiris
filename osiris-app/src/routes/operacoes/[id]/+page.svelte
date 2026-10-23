<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Check, CheckCircle2, CircleAlert, Clock, Flag, Home, Play, Send, Star, Tractor, XCircle } from 'lucide-svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import CancelBookingDialog from '$lib/components/CancelBookingDialog.svelte';
	import AppRating from '$lib/components/ui/AppRating.svelte';
	import { supabase } from '$lib/supabase';
	import { userMessage } from '$lib/errors';
	import { watchChanges } from '$lib/realtime';
	import { track, trackError } from '$lib/telemetry';
	import { m } from '$lib/paraglide/messages';
	import { formatBRL, formatDate } from '$lib/i18n';
	import { bookingStatusLabel as sharedBookingStatusLabel } from '$lib/notifications';

	// etapas mostradas no topo (fluxo de bookings.status aplicado pelos triggers)
	const OPERATION_STAGES = [
		{ status: 'pendente', label: m.operacao_etapa_aguardando, icon: Clock },
		{ status: 'em_operacao', label: m.operacao_etapa_em_campo, icon: Tractor },
		{ status: 'em_avaliacao', label: m.operacao_etapa_avaliacao, icon: Star },
		{ status: 'finalizada', label: m.operacao_etapa_finalizada, icon: Flag }
	];

	function stageIndex(status) {
		return OPERATION_STAGES.findIndex((stage) => stage.status === status);
	}

	function formatCurrency(value) {
		if (value === null || value === undefined || value === '') return m.comum_preco_a_combinar();
		return formatBRL(value);
	}

	function formatDbDate(dateString) {
		if (!dateString) return '—';
		const [year, month, day] = String(dateString).split('T')[0].split('-');
		if (!year || !month || !day) return dateString;
		// data local (sem fuso), para não voltar um dia
		return formatDate(new Date(Number(year), Number(month) - 1, Number(day)));
	}

	function bookingStatusLabel(status) {
		if (!status) return '—';
		if (status === 'bloqueado_prestador') return m.operacao_status_bloqueado();
		return sharedBookingStatusLabel(status);
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
		return booking?.products?.name || booking?.services?.title || m.operacao_titulo();
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
		return profile?.display_name || (isProvider ? m.operacao_cliente() : m.operacao_anunciante());
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
			reviewerName: profilesById[row.reviewer_id]?.display_name || m.operacao_usuario(),
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

	/** @param {{ silent?: boolean }} [options] silent: atualiza sem esconder a tela (mudança vinda do tempo real) */
	async function loadBooking(id, { silent = false } = {}) {
		if (!id) {
			errorMessage = m.operacao_id_invalido();
			booking = null;
			loading = false;
			return;
		}

		if (!silent) {
			loading = true;
			errorMessage = '';
			booking = null;
			reviews = [];
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			await goto(resolve(`/login?redirect=/operacoes/${id}`));
			return;
		}

		authUserId = user.id;

		const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();

		if (error) {
			console.error('Erro ao carregar operação:', error);
			errorMessage = userMessage(error, m.operacao_erro_carregar());
			loading = false;
			return;
		}

		if (!data) {
			errorMessage = m.operacao_nao_encontrada();
			loading = false;
			return;
		}

		if (data.client_id !== user.id && data.provider_id !== user.id) {
			errorMessage = m.operacao_sem_acesso();
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

	// status mudado pela outra parte (iniciar, encerrar, cancelar) e avaliações novas
	$effect(() => {
		const id = bookingId;
		if (!id) return;

		return watchChanges(
			`booking-${id}`,
			[
				{ event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }
			],
			() => loadBooking(id, { silent: true })
		);
	});

	async function updateBookingStatus(newStatus) {
		const id = bookingId;
		if (!id) return;

		actionLoading = true;
		const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);

		actionLoading = false;

		if (error) {
			trackError('operacao_status_falhou', error, { status: newStatus });
			errorMessage = userMessage(error, m.operacao_erro_acao());
		} else {
			track(OPERATION_EVENT[newStatus] ?? 'operacao_status', { status: newStatus });
			await loadBooking(id);
		}
	}

	const OPERATION_EVENT = {
		em_operacao: 'operacao_iniciada',
		em_avaliacao: 'operacao_encerrada',
		finalizada: 'operacao_finalizada'
	};

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
			trackError('avaliacao_falhou', error);
			errorMessage = userMessage(error, m.operacao_erro_acao());
			return;
		}
		track('avaliacao_enviada', { nota: rating, com_comentario: Boolean(comment.trim()) });

		comment = '';
		await loadBooking(id);
		await tryFinalizeAfterReviews();
	}
</script>

<svelte:head>
	<title>{m.operacao_titulo()} — Osiris</title>
</svelte:head>

<div class="min-h-screen pb-24 lg:pb-0">
	<Header title={m.operacao_titulo()} backHref="/negociacoes" />

	<main class="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 lg:max-w-6xl lg:space-y-6 lg:px-8 lg:py-6">
		{#if booking}
			<nav class="hidden min-w-0 items-center gap-1.5 text-sm lg:flex" aria-label={m.operacao_caminho()}>
				<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
					<Home size={16} />
					{m.nav_inicio()}
				</a>
				<span class="text-surface-700-300">/</span>
				<a href={resolve('/negociacoes')} class="text-surface-800-200 hover:text-primary-700-300">{m.operacao_negociacoes()}</a>
				<span class="text-surface-700-300">/</span>
				<span class="truncate font-semibold text-surface-950-50" aria-current="page">{listingTitle()}</span>
			</nav>
		{/if}

		{#if loading}
			<div class="space-y-4" role="status" aria-live="polite">
				<span class="sr-only">{m.operacao_carregando()}</span>
				<div class="placeholder h-24 w-full animate-pulse rounded-container"></div>
				<div class="placeholder h-56 w-full animate-pulse rounded-container"></div>
			</div>
		{:else if errorMessage && !booking}
			<div class="flex items-start gap-3 rounded-container preset-tonal-error p-4 text-sm">
				<CircleAlert class="h-5 w-5 shrink-0" />
				{errorMessage}
			</div>
		{:else if booking}
			<!-- etapas da operação (bookings.status) -->
			{#if stageIndex(booking.status) >= 0}
				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm lg:px-10 lg:py-6" aria-label={m.operacao_etapas()}>
					<ol class="flex items-start">
						{#each OPERATION_STAGES as stage, index (stage.status)}
							{@const current = stageIndex(booking.status)}
							{@const done = index < current || booking.status === 'finalizada'}
							{@const active = index === current && booking.status !== 'finalizada'}
							<li class="flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={active ? 'step' : undefined}>
								<div class="flex w-full items-center">
									<span class="h-0.5 flex-1 {index === 0 ? 'opacity-0' : done || active ? 'bg-primary-500' : 'bg-surface-300-700'}"></span>
									<span
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 {done
											? 'border-primary-500 preset-filled-primary-500'
											: active
												? 'border-primary-500 preset-tonal-primary'
												: 'border-surface-300-700 bg-surface-50-950 text-surface-700-300'}"
									>
										{#if done}
											<Check class="h-5 w-5" />
										{:else}
											<stage.icon class="h-4 w-4" />
										{/if}
									</span>
									<span class="h-0.5 flex-1 {index === OPERATION_STAGES.length - 1 ? 'opacity-0' : done ? 'bg-primary-500' : 'bg-surface-300-700'}"></span>
								</div>
								<span class="text-xs leading-tight {active || done ? 'font-bold text-surface-950-50' : 'font-medium text-surface-800-200'}">{stage.label()}</span>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			<!-- computador: dados da operação à esquerda; ações, avaliação e avaliações à direita -->
			<div class="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
			<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm lg:sticky lg:top-20 lg:p-6">
				{#if booking.coverUrl}
					<img
						src={booking.coverUrl}
						alt={listingTitle()}
						class="mb-4 aspect-[16/9] w-full rounded-container object-cover"
					/>
				{/if}

				<div class="flex items-center justify-between gap-2">
					<span class="preset-typo-label">{m.operacao_titulo()}</span>
					<span
						class="badge rounded-full px-2.5 py-1 uppercase text-xs font-bold tracking-wide {statusBadgeClass(
							bookingStatusTone(booking.status)
						)}"
					>
						{bookingStatusLabel(booking.status)}
					</span>
				</div>

				<div class="mt-2 flex items-center gap-3">
					{#if counterpartyPhoto()}
						<img
							src={counterpartyPhoto()}
							alt={counterpartyName()}
							class="h-12 w-12 shrink-0 rounded-full object-cover"
						/>
					{:else}
						<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full preset-tonal-primary text-lg font-bold">
							{counterpartyName().slice(0, 1).toUpperCase()}
						</span>
					{/if}
					<div class="min-w-0">
						{#if listingHref()}
							<a href={resolve(listingHref())} class="line-clamp-2 text-xl font-bold leading-tight text-surface-950-50 hover:text-primary-700-300">
								{listingTitle()}
							</a>
						{:else}
							<h1 class="line-clamp-2 preset-typo-title">{listingTitle()}</h1>
						{/if}
						<p class="mt-0.5 text-sm text-surface-800-200">
							{isProvider ? m.operacao_cliente() : m.operacao_anunciante()}: <span class="font-semibold text-surface-950-50">{counterpartyName()}</span>
						</p>
					</div>
				</div>

				<dl class="mt-4 grid grid-cols-2 gap-2">
					<div class="rounded-container bg-surface-100-900 p-3">
						<dt class="preset-typo-label">{m.operacao_valor_acordado()}</dt>
						<dd class="mt-0.5 text-xl font-bold text-primary-700-300">{formatCurrency(booking.total_price)}</dd>
					</div>
					<div class="rounded-container bg-surface-100-900 p-3">
						<dt class="preset-typo-label">{m.operacao_periodo()}</dt>
						<dd class="mt-0.5 text-sm font-semibold text-surface-950-50">
							{formatDbDate(booking.start_date)}
							<span class="block text-surface-800-200">{m.operacao_ate_data({ data: formatDbDate(booking.end_date) })}</span>
						</dd>
					</div>
				</dl>
			</section>

			<div class="space-y-4">
			{#if errorMessage}
				<div class="flex items-start gap-2 rounded-container preset-tonal-error p-3 text-sm">
					<CircleAlert class="h-5 w-5 shrink-0" />
					{errorMessage}
				</div>
			{/if}

			{#if isProvider}
				<div class="space-y-3">
					{#if booking.status === 'pendente'}
						<button
							type="button"
							onclick={() => updateBookingStatus('em_operacao')}
							disabled={actionLoading}
							class="btn btn-lg preset-filled-primary-500 w-full"
						>
							<Play size={18} />
							<span>{m.operacao_iniciar()}</span>
						</button>
					{/if}

					{#if booking.status === 'em_operacao'}
						<button
							type="button"
							onclick={() => updateBookingStatus('em_avaliacao')}
							disabled={actionLoading}
							class="btn btn-lg preset-filled-secondary-500 w-full"
						>
							<Flag size={18} />
							<span>{m.operacao_encerrar()}</span>
						</button>
					{/if}

					{#if !['finalizada', 'cancelado', 'bloqueado_prestador', 'em_avaliacao'].includes(
						booking.status
					)}
						<button
							type="button"
							onclick={() => (showCancelDialog = true)}
							class="btn btn-lg preset-tonal-error w-full"
						>
							<XCircle size={18} />
							<span>{m.operacao_cancelar()}</span>
						</button>
					{/if}
				</div>
			{:else if booking.status === 'pendente'}
				<div class="flex items-start gap-3 rounded-container preset-tonal-warning p-4 text-sm font-medium">
					<Clock class="h-5 w-5 shrink-0" />
					{m.operacao_aguardando_anunciante()}
				</div>
			{:else if booking.status === 'em_operacao'}
				<div class="flex items-start gap-3 rounded-container preset-tonal-primary p-4 text-sm font-medium">
					<Tractor class="h-5 w-5 shrink-0" />
					{m.operacao_em_andamento()}
				</div>
			{/if}

			{#if booking.status === 'em_avaliacao'}
				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
					<h2 class="flex items-center gap-2 preset-typo-title">
						<Star class="h-5 w-5 fill-current text-warning-500" />
						{m.operacao_avaliar_experiencia()}
					</h2>

					{#if myReview}
						<div class="mt-3 flex items-center gap-2 rounded-container preset-tonal-success p-3 text-sm font-medium">
							<CheckCircle2 class="h-5 w-5 shrink-0" />
							{m.operacao_ja_avaliou({ nota: myReview.rating })}
						</div>
					{:else if canReview}
						<div class="mt-3">
							<AppRating bind:value={rating} readOnly={false} label={m.operacao_sua_nota()} />
						</div>
						<textarea
							rows="3"
							bind:value={comment}
							placeholder={m.operacao_comentario_opcional()}
							aria-label={m.operacao_comentario()}
							class="textarea mt-3 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-2.5 text-base"
						></textarea>
						<button
							type="button"
							onclick={submitReview}
							disabled={reviewSubmitting}
							class="btn btn-lg preset-filled-primary-500 mt-3 w-full"
						>
							<Send size={18} />
							<span>{reviewSubmitting ? m.operacao_enviando() : m.operacao_enviar_avaliacao()}</span>
						</button>
					{/if}

					<p class="mt-3 text-sm text-surface-800-200">
						{m.operacao_finaliza_automatico()}
					</p>

					{#if canManualFinalize}
						<button
							type="button"
							onclick={() => updateBookingStatus('finalizada')}
							disabled={actionLoading}
							class="btn btn-lg preset-tonal mt-4 w-full"
						>
							<CheckCircle2 size={18} />
							<span>{m.operacao_encerrar_manual()}</span>
						</button>
					{/if}
				</section>
			{/if}

			{#if booking.status === 'finalizada'}
				<div class="flex items-center gap-3 rounded-container preset-tonal-success p-4 text-sm font-medium">
					<CheckCircle2 class="h-6 w-6 shrink-0" />
					{#if bothReviewed}
						{m.operacao_finalizada_obrigado()}
					{:else}
						{m.operacao_encerrada()}
					{/if}
				</div>
			{/if}

			{#if reviews.length}
				<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
					<div class="flex items-center justify-between gap-2">
						<h2 class="preset-typo-title">{m.operacao_avaliacoes_desta()}</h2>
						<span class="badge rounded-full preset-tonal-surface px-2 py-0.5 text-xs font-semibold">{reviews.length}</span>
					</div>
					<ul class="mt-3 space-y-2">
						{#each reviews as review (review.id)}
							<li class="rounded-container bg-surface-100-900 p-3">
								<div class="flex items-center gap-3">
									{#if review.reviewerPhoto}
										<img
											src={review.reviewerPhoto}
											alt={review.reviewerName}
											class="h-10 w-10 rounded-full object-cover"
										/>
									{:else}
										<span class="flex h-10 w-10 items-center justify-center rounded-full preset-tonal-primary font-bold">
											{review.reviewerName?.slice(0, 1).toUpperCase()}
										</span>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-bold text-surface-950-50">{review.reviewerName}</p>
										<AppRating value={review.rating} size="sm" showCount={false} />
									</div>
								</div>
								{#if review.comment}
									<p class="mt-2 text-sm italic text-surface-900-100">"{review.comment}"</p>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			</div>
			</div>
		{/if}
	</main>

	<CancelBookingDialog
		bind:open={showCancelDialog}
		{bookingId}
		oncancelled={() => loadBooking(bookingId)}
	/>

	<SiteFooter />
	<BottomNav active="mais" />
</div>
