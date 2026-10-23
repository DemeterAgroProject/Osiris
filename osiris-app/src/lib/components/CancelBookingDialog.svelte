<script>
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { ArrowLeft, XCircle } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';
	import { userMessage } from '$lib/errors';
	import { track, trackError } from '$lib/telemetry';
	import { m } from '$lib/paraglide/messages';

	// valores aceitos por bookings_cancellation_reason_check (o id vai para o banco; só o rótulo traduz)
	const REASONS = [
		{ id: 'mechanical_issue', label: m.operacao_motivo_mecanico },
		{ id: 'weather_conditions', label: m.operacao_motivo_clima },
		{ id: 'logistical_issue', label: m.operacao_motivo_logistica },
		{ id: 'operational_unavailability', label: m.operacao_motivo_indisponibilidade },
		{ id: 'commercial_disagreement', label: m.operacao_motivo_desacordo },
		{ id: 'withdrawal', label: m.operacao_motivo_desistencia },
		{ id: 'other', label: m.operacao_motivo_outro }
	];
	const MIN_DETAILS_LENGTH = 15;

	let {
		open = $bindable(false),
		bookingId = null,
		title = m.operacao_cancelar_titulo(),
		message = m.operacao_cancelar_mensagem(),
		oncancelled = () => {}
	} = $props();

	let reason = $state('');
	let details = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	const needsDetails = $derived(reason === 'other');
	const canSubmit = $derived(
		Boolean(reason) && (!needsDetails || details.trim().length >= MIN_DETAILS_LENGTH)
	);

	$effect(() => {
		if (open) {
			reason = '';
			details = '';
			errorMessage = '';
		}
	});

	function close() {
		if (loading) return;
		open = false;
	}

	async function handleConfirm() {
		if (loading || !canSubmit || !bookingId) return;

		loading = true;
		errorMessage = '';
		const { error } = await supabase.rpc('cancel_booking', {
			p_booking_id: bookingId,
			p_cancellation_reason: reason,
			p_cancellation_reason_details: needsDetails ? details.trim() : null
		});
		loading = false;

		if (error) {
			trackError('cancelamento_falhou', error, { motivo: reason });
			errorMessage = userMessage(error, m.operacao_erro_cancelar());
			return;
		}

		track('operacao_cancelada', { motivo: reason });
		open = false;
		oncancelled();
	}
</script>

<AppDialog
	bind:open
	{title}
	description={message}
	role="alertdialog"
	dismissible={!loading}
>
	<label for="cancel-booking-reason" class="mb-1 block text-sm font-medium text-surface-900-100">
		{m.operacao_motivo()}
	</label>
	<select
		id="cancel-booking-reason"
		bind:value={reason}
		disabled={loading}
		class="w-full rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-sm outline-none focus:border-primary-500"
	>
		<option value="" disabled>{m.operacao_selecione()}</option>
		{#each REASONS as option (option.id)}
			<option value={option.id}>{option.label()}</option>
		{/each}
	</select>

	{#if needsDetails}
		<label for="cancel-booking-details" class="mb-1 mt-3 block text-sm font-medium text-surface-900-100">
			{m.operacao_descreva_motivo()}
		</label>
		<textarea
			id="cancel-booking-details"
			placeholder={m.operacao_descreva_motivo_exemplo()}
			bind:value={details}
			disabled={loading}
			rows="3"
			class="w-full rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-sm outline-none focus:border-primary-500"
		></textarea>
		<p class="mt-1 text-xs text-surface-800-200">
			{m.operacao_minimo_caracteres({ minimo: MIN_DETAILS_LENGTH, atual: details.trim().length })}
		</p>
	{/if}

	{#if errorMessage}
		<p class="mt-3 text-sm text-error-500">{errorMessage}</p>
	{/if}

	{#snippet footer()}
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={close}
				disabled={loading}
				class="btn btn-md preset-tonal w-full"
			>
				<ArrowLeft size={18} />
				<span>{m.comum_voltar()}</span>
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={loading || !canSubmit}
				class="btn btn-md preset-filled-error-500 w-full"
			>
				<XCircle size={18} />
				<span>{loading ? m.operacao_aguarde() : m.operacao_cancelar()}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>
