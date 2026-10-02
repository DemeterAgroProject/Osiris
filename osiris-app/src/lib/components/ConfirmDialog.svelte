<script>
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

	function close() {
		if (loading) return;
		open = false;
		oncancel();
	}

	function handleConfirm() {
		if (loading) return;
		onconfirm();
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape' && !loading) close();
	}}
/>

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4"
		role="presentation"
	>
		<button
			type="button"
			class="absolute inset-0 z-0 border-0 bg-surface-950/50 p-0"
			onclick={close}
			aria-label="Fechar diálogo"
			disabled={loading}
		></button>

		<div
			class="relative z-10 w-full max-w-sm rounded-container bg-surface-50-950 p-5 shadow-2xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
			aria-describedby="confirm-dialog-message"
		>
			<div class="mb-4 flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<h2 id="confirm-dialog-title" class="text-lg font-bold text-surface-950-50">{title}</h2>
					{#if message}
						<p id="confirm-dialog-message" class="mt-2 text-sm leading-relaxed text-surface-600-400">
							{message}
						</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={close}
					disabled={loading}
					class="shrink-0 rounded-full p-1.5 text-surface-600-400 transition-colors hover:preset-tonal hover:text-surface-600-400 disabled:opacity-50"
					aria-label="Fechar"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={close}
					disabled={loading}
					class="rounded-container border border-surface-200-800 py-3 text-sm font-medium text-surface-700-300 transition-colors hover:preset-tonal disabled:opacity-50"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={loading}
					class="rounded-container py-3 text-sm font-semibold transition-colors focus:ring-2 focus:ring-offset-1 disabled:opacity-60 {confirmButtonClass}"
				>
					{loading ? 'Aguarde...' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
