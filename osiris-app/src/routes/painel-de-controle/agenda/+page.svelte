<script>
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import {
		ChevronLeft,
		ChevronRight,
		Calendar,
		Clock,
		CheckCircle2,
		XCircle,
		MessageSquare
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	const monthNames = [
		'Janeiro',
		'Fevereiro',
		'Março',
		'Abril',
		'Maio',
		'Junho',
		'Julho',
		'Agosto',
		'Setembro',
		'Outubro',
		'Novembro',
		'Dezembro'
	];

	const ACTIVE_BOOKING_STATUSES = ['pendente', 'em_operacao', 'em_avaliacao'];
	const ACTIVE_NEGOTIATION_STATUSES = ['solicitada', 'em_negociacao'];
	const INACTIVE_STATUSES = ['cancelado', 'finalizada', 'bloqueado_prestador', 'recusada', 'aceita'];

	let loading = $state(true);
	let agendaItems = $state([]);
	let currentDate = $state(new Date());
	let showCancelModal = $state(false);
	let itemToCancel = $state(null);

	let currentYear = $derived(currentDate.getFullYear());
	let currentMonth = $derived(currentDate.getMonth());

	function dateOnly(value) {
		if (!value) return null;
		return String(value).split('T')[0];
	}

	function formatDbDate(dateString) {
		const normalized = dateOnly(dateString);
		if (!normalized) return '';
		const [year, month, day] = normalized.split('-');
		return `${day}/${month}/${year}`;
	}

	function rangesOverlap(aStart, aEnd, bStart, bEnd) {
		if (!aStart || !aEnd || !bStart || !bEnd) return false;
		return aStart <= bEnd && aEnd >= bStart;
	}

	function resolveCalendarCellState(dayItems) {
		if (dayItems.length > 1) return 'conflito';
		return dayItems[0]?.status ?? 'livre';
	}

	async function fetchListingTitle(productId, serviceId) {
		if (productId) {
			const { data } = await supabase.from('products').select('name').eq('id', productId).maybeSingle();
			return data?.name || 'Produto';
		}
		if (serviceId) {
			const { data } = await supabase.from('services').select('title').eq('id', serviceId).maybeSingle();
			return data?.title || 'Serviço';
		}
		return 'Reserva';
	}

	async function enrichBookingRow(row) {
		const title = await fetchListingTitle(row.product_id, row.service_id);
		return {
			id: row.id,
			kind: 'booking',
			status: row.status,
			start_date: dateOnly(row.start_date),
			end_date: dateOnly(row.end_date),
			title,
			total_price: row.total_price,
			href: `/operacoes/${row.id}`
		};
	}

	async function enrichNegotiationRow(row) {
		const start_date = dateOnly(row.proposed_start_date);
		const end_date = dateOnly(row.proposed_end_date);
		if (!start_date || !end_date) return null;

		const title = await fetchListingTitle(row.product_id, row.service_id);
		return {
			id: row.id,
			kind: 'negotiation',
			status: row.status,
			start_date,
			end_date,
			title,
			total_price: row.proposed_price,
			href: `/negociacoes/${row.id}`
		};
	}

	async function loadAgenda() {
		loading = true;

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			agendaItems = [];
			loading = false;
			return;
		}

		const [bookingsRes, negotiationsRes] = await Promise.all([
			supabase
				.from('bookings')
				.select('id, start_date, end_date, status, total_price, product_id, service_id')
				.eq('provider_id', user.id)
				.in('status', ACTIVE_BOOKING_STATUSES),
			supabase
				.from('negotiations')
				.select(
					'id, status, proposed_start_date, proposed_end_date, proposed_price, product_id, service_id'
				)
				.eq('provider_id', user.id)
				.in('status', ACTIVE_NEGOTIATION_STATUSES)
		]);

		if (bookingsRes.error) {
			console.error('Erro ao carregar bookings da agenda:', bookingsRes.error);
		}
		if (negotiationsRes.error) {
			console.error('Erro ao carregar negociações da agenda:', negotiationsRes.error);
		}

		const bookingItems = await Promise.all((bookingsRes.data ?? []).map(enrichBookingRow));
		const negotiationItems = (
			await Promise.all((negotiationsRes.data ?? []).map(enrichNegotiationRow))
		).filter(Boolean);

		agendaItems = [...bookingItems, ...negotiationItems];
		loading = false;
	}

	const calendarDays = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
		const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const daysArray = [];

		for (let i = 0; i < firstDayOfMonth; i++) {
			daysArray.push({ day: null, dateString: null, cellState: null });
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const monthStr = String(currentMonth + 1).padStart(2, '0');
			const dayStr = String(day).padStart(2, '0');
			const dateString = `${currentYear}-${monthStr}-${dayStr}`;

			const dayItems = agendaItems.filter(
				(item) =>
					item.start_date &&
					item.end_date &&
					dateString >= item.start_date &&
					dateString <= item.end_date
			);

			daysArray.push({
				day,
				dateString,
				cellState: dayItems.length ? resolveCalendarCellState(dayItems) : 'livre'
			});
		}

		return daysArray;
	});

	const pendingBookings = $derived(agendaItems.filter((i) => i.kind === 'booking' && i.status === 'pendente'));
	const activeNegotiations = $derived(
		agendaItems.filter((i) => i.kind === 'negotiation' && ACTIVE_NEGOTIATION_STATUSES.includes(i.status))
	);
	const operatingBookings = $derived(
		agendaItems.filter((i) => i.kind === 'booking' && i.status === 'em_operacao')
	);

	function hasConflict(item) {
		return agendaItems.some(
			(other) =>
				other.id !== item.id &&
				!INACTIVE_STATUSES.includes(other.status) &&
				rangesOverlap(item.start_date, item.end_date, other.start_date, other.end_date)
		);
	}

	function changeMonth(direction) {
		currentDate = new Date(currentYear, currentMonth + direction, 1);
	}

	async function updateBookingStatus(bookingId, newStatus) {
		const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);

		if (!error) {
			await loadAgenda();
		} else {
			alert('Erro ao atualizar status: ' + error.message);
		}
	}

	function openCancelModal(item) {
		itemToCancel = item;
		showCancelModal = true;
	}

	function closeCancelModal() {
		showCancelModal = false;
		itemToCancel = null;
	}

	async function confirmCancellation() {
		if (itemToCancel?.kind === 'booking') {
			await updateBookingStatus(itemToCancel.id, 'cancelado');
		}
		closeCancelModal();
	}

	onMount(() => {
		loadAgenda();
	});
</script>

<div class="min-h-screen bg-surface-50-950 pb-20">
	<Header />

	<main class="mx-auto w-full max-w-3xl space-y-6 px-4 py-4">
		<div>
			<h1 class="text-xl font-bold text-surface-950-50">Minha Agenda</h1>
			<p class="mt-0.5 text-sm text-surface-700-300">
				Propostas em negociação e operações confirmadas no calendário.
			</p>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<LoadingIndicator label="Carregando agenda..." />
			</div>
		{:else}
			<div class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 ">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-base font-bold text-surface-950-50">{monthNames[currentMonth]} {currentYear}</h2>
					<div class="flex gap-1">
						<button
							type="button"
							onclick={() => changeMonth(-1)}
							class="rounded-container border border-surface-200-800 p-2 hover:bg-surface-100-900"
						>
							<ChevronLeft class="h-4 w-4 text-surface-700-300" />
						</button>
						<button
							type="button"
							onclick={() => changeMonth(1)}
							class="rounded-container border border-surface-200-800 p-2 hover:bg-surface-100-900"
						>
							<ChevronRight class="h-4 w-4 text-surface-700-300" />
						</button>
					</div>
				</div>

				<div
					style="display: grid; grid-template-columns: repeat(7, 1fr);"
					class="mb-2 gap-1 text-center text-xs font-semibold text-surface-700-300"
				>
					<div>Dom</div>
					<div>Seg</div>
					<div>Ter</div>
					<div>Qua</div>
					<div>Qui</div>
					<div>Sex</div>
					<div>Sáb</div>
				</div>

				<div style="display: grid; grid-template-columns: repeat(7, 1fr);" class="gap-1">
					{#each calendarDays as { day, cellState }}
						<div
							style="aspect-ratio: 1 / 1;"
							class="relative flex items-center justify-center rounded-container border text-sm transition-all
							{day
								? cellState === 'conflito'
									? 'preset-filled-error-500 font-bold '
									: cellState === 'em_operacao'
										? 'preset-filled-primary-500 font-bold '
										: cellState === 'pendente'
											? 'animate-pulse preset-tonal-warning font-bold '
											: cellState === 'em_negociacao'
												? 'preset-filled-secondary-500 font-bold '
												: cellState === 'solicitada'
													? 'preset-tonal-secondary font-bold '
													: 'border-surface-200-800 bg-surface-50-950 text-surface-950-50'
								: 'border-none bg-transparent text-transparent'}"
						>
							{day || ''}
						</div>
					{/each}
				</div>

				<div
					class="mt-4 flex flex-wrap justify-center gap-3 border-t border-surface-200-800 pt-3 text-xs font-medium"
				>
					<div class="flex items-center gap-1.5">
						<span class="h-3 w-3 rounded border border-secondary-500 preset-tonal-secondary"></span> Proposta nova
					</div>
					<div class="flex items-center gap-1.5">
						<span class="h-3 w-3 rounded preset-filled-secondary-500"></span> Em negociação
					</div>
					<div class="flex items-center gap-1.5">
						<span class="h-3 w-3 rounded preset-tonal-warning"></span> Booking pendente
					</div>
					<div class="flex items-center gap-1.5">
						<span class="h-3 w-3 rounded preset-filled-primary-500"></span> Em operação
					</div>
					<div class="flex items-center gap-1.5">
						<span class="h-3 w-3 rounded preset-filled-error-500"></span> Conflito
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<h2 class="text-base font-bold text-surface-950-50">Propostas em negociação</h2>

				{#each activeNegotiations as neg (neg.id)}
					{@const conflict = hasConflict(neg)}
					<div
						class="flex flex-col justify-between gap-3 rounded-container border bg-surface-50-950 p-4  {conflict
							? 'border-error-500 ring-1 ring-error-500/20'
							: 'border-surface-200-800'}"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container {conflict
									? 'preset-tonal-error'
									: 'preset-tonal-secondary'}"
							>
								<MessageSquare
									class="h-5 w-5 {conflict ? 'text-error-500' : 'text-secondary-600'}"
								/>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-sm font-bold text-surface-950-50">{neg.title}</h3>
								<p class="mt-0.5 flex items-center gap-1 text-xs text-surface-700-300">
									<Clock class="h-3 w-3" />
									De {formatDbDate(neg.start_date)} até {formatDbDate(neg.end_date)}
								</p>
								<span
									class="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase preset-tonal-secondary"
								>
									{neg.status === 'solicitada' ? 'Solicitada' : 'Em negociação'}
								</span>
							</div>
						</div>

						{#if conflict}
							<div
								class="flex items-center gap-1.5 rounded-container preset-tonal-error px-2.5 py-2 text-xs font-medium"
							>
								<AlertCircle class="h-4 w-4 shrink-0" />
								Atenção: período sobreposto a outra atividade na agenda.
							</div>
						{/if}

						<a
							href={neg.href}
							class="flex w-full items-center justify-center gap-1 rounded-container preset-filled-secondary-500 py-2 text-xs font-semibold"
						>
							Abrir negociação
						</a>
					</div>
				{:else}
					<div
						class="rounded-container border border-surface-200-800 bg-surface-50-950 py-6 text-center text-sm text-surface-700-300"
					>
						Nenhuma proposta com datas no momento.
					</div>
				{/each}
			</div>

			<div class="space-y-3">
				<h2 class="text-base font-bold text-surface-950-50">Bookings pendentes</h2>

				{#each pendingBookings as req (req.id)}
					{@const conflict = hasConflict(req)}
					<div
						class="flex flex-col justify-between gap-3 rounded-container border bg-surface-50-950 p-4  {conflict
							? 'border-error-500 ring-1 ring-error-500/20'
							: 'border-surface-200-800'}"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container {conflict
									? 'preset-tonal-error'
									: 'preset-tonal-warning'}"
							>
								<Calendar class="h-5 w-5 {conflict ? 'text-error-500' : 'text-warning-600'}" />
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-sm font-bold text-surface-950-50">{req.title}</h3>
								<p class="mt-0.5 flex items-center gap-1 text-xs text-surface-700-300">
									<Clock class="h-3 w-3" />
									De {formatDbDate(req.start_date)} até {formatDbDate(req.end_date)}
								</p>
							</div>
						</div>

						{#if conflict}
							<div
								class="flex items-center gap-1.5 rounded-container preset-tonal-error px-2.5 py-2 text-xs font-medium"
							>
								<AlertCircle class="h-4 w-4 shrink-0" />
								Atenção: você já possui atividades marcadas nestes dias.
							</div>
						{/if}

						<div class="flex gap-2">
							<a
								href={req.href}
								class="flex flex-1 items-center justify-center gap-1 rounded-container preset-filled-primary-500 py-2 text-xs font-semibold"
							>
								<CheckCircle2 class="h-3.5 w-3.5" /> Gerenciar
							</a>
							<button
								type="button"
								onclick={() => updateBookingStatus(req.id, 'cancelado')}
								class="flex flex-1 items-center justify-center gap-1 rounded-container border border-surface-200-800 bg-surface-50-950 py-2 text-xs font-semibold text-surface-700-300 hover:preset-tonal"
							>
								<XCircle class="h-3.5 w-3.5" /> Cancelar
							</button>
						</div>
					</div>
				{:else}
					<div
						class="rounded-container border border-surface-200-800 bg-surface-50-950 py-6 text-center text-sm text-surface-700-300"
					>
						Nenhum booking pendente no momento.
					</div>
				{/each}
			</div>

			<div class="space-y-3 p-0.5">
				<h2 class="text-base font-bold text-surface-950-50">Em operação</h2>

				{#each operatingBookings as conf (conf.id)}
					<div
						class="flex flex-col justify-between gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 "
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container preset-tonal-primary"
							>
								<Calendar class="h-5 w-5 text-primary-600" />
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-sm font-bold text-surface-950-50">{conf.title}</h3>
								<p class="mt-0.5 flex items-center gap-1 text-xs text-surface-700-300">
									<Clock class="h-3 w-3" />
									De {formatDbDate(conf.start_date)} até {formatDbDate(conf.end_date)}
								</p>
							</div>
						</div>

						<div class="flex gap-2 border-t border-surface-200-800 pt-2">
							<a
								href={conf.href}
								class="flex flex-1 items-center justify-center gap-1 rounded-container border border-primary-500 preset-tonal-primary py-2 text-xs font-semibold"
							>
								Ver operação
							</a>
							<button
								type="button"
								onclick={() => openCancelModal(conf)}
								class="flex flex-1 items-center justify-center gap-1 rounded-container border border-error-500 bg-surface-50-950 py-2 text-xs font-semibold text-error-500 transition-colors hover:preset-tonal-error"
							>
								<XCircle class="h-3.5 w-3.5" /> Cancelar
							</button>
						</div>
					</div>
				{:else}
					<div
						class="rounded-container border border-surface-200-800 bg-surface-50-950 py-6 text-center text-sm text-surface-700-300"
					>
						Nenhuma operação em campo no momento.
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<BottomNav active="inicio" />
</div>

<ConfirmDialog
	bind:open={showCancelModal}
	title="Cancelar atividade?"
	message="As datas serão liberadas no calendário para novos agendamentos."
	confirmLabel="Sim, cancelar"
	cancelLabel="Voltar"
	variant="danger"
	onconfirm={confirmCancellation}
	oncancel={closeCancelModal}
/>
