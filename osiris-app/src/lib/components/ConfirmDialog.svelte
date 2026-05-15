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
			? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30'
			: variant === 'warning'
				? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30'
				: 'bg-green-600 hover:bg-green-700 focus:ring-green-500/30'
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
	<button
		type="button"
		class="fixed inset-0 z-[100] border-0 bg-black/50 p-0"
		onclick={close}
		aria-label="Fechar diálogo"
		disabled={loading}
	></button>

	<div
		class="fixed inset-x-4 top-1/2 z-[110] mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:w-full"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		aria-describedby="confirm-dialog-message"
	>
		<div class="mb-4 flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h2 id="confirm-dialog-title" class="text-lg font-bold text-gray-900">{title}</h2>
				{#if message}
					<p id="confirm-dialog-message" class="mt-2 text-sm leading-relaxed text-gray-600">
						{message}
					</p>
				{/if}
			</div>
			<button
				type="button"
				onclick={close}
				disabled={loading}
				class="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
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
				class="rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
			>
				{cancelLabel}
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={loading}
				class="rounded-xl py-3 text-sm font-semibold text-white transition-colors focus:ring-2 focus:ring-offset-1 disabled:opacity-60 {confirmButtonClass}"
			>
				{loading ? 'Aguarde...' : confirmLabel}
			</button>
		</div>
	</div>
{/if}
