<script>
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { X } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = 'Confirmar',
		message = '',
		confirmLabel = 'Confirmar',
		cancelLabel = 'Cancelar',
		loading = false,
		variant = 'default',
		onconfirm = () => {},
		oncancel = () => {}
	} = $props();

	const confirmButtonClass = $derived(
		variant === 'danger'
			? 'preset-filled-error-500 focus:ring-error-500/30'
			: variant === 'warning'
				? 'preset-filled-warning-500 focus:ring-warning-500/30'
				: 'preset-filled-primary-500 focus:ring-primary-500/30'
	);

	function handleOpenChange(details) {
		if (!details.open && open) oncancel();
		open = details.open;
	}

	function handleConfirm() {
		if (loading) return;
		onconfirm();
	}
</script>

<Dialog
	{open}
	onOpenChange={handleOpenChange}
	closeOnEscape={!loading}
	closeOnInteractOutside={!loading}
	role="alertdialog"
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[100] bg-surface-950/60 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-[101] flex items-end justify-center p-4 sm:items-center">
			<Dialog.Content
				class="card w-full max-w-sm rounded-container border border-surface-200-800 bg-surface-50-950 p-5"
			>
				<div class="mb-4 flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<Dialog.Title class="text-lg font-bold text-surface-950-50">{title}</Dialog.Title>
						{#if message}
							<Dialog.Description class="mt-2 text-sm leading-relaxed text-surface-700-300">
								{message}
							</Dialog.Description>
						{/if}
					</div>
					<Dialog.CloseTrigger
						disabled={loading}
						class="btn-icon shrink-0 rounded-full preset-tonal-surface disabled:opacity-50"
						aria-label="Fechar"
					>
						<X class="h-5 w-5" />
					</Dialog.CloseTrigger>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<Dialog.CloseTrigger
						disabled={loading}
						class="btn min-h-11 w-full preset-outlined-surface-500 disabled:opacity-50"
					>
						{cancelLabel}
					</Dialog.CloseTrigger>
					<button
						type="button"
						onclick={handleConfirm}
						disabled={loading}
						class="btn min-h-11 w-full font-semibold focus:ring-2 focus:ring-offset-1 disabled:opacity-60 {confirmButtonClass}"
					>
						{loading ? 'Aguarde...' : confirmLabel}
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
