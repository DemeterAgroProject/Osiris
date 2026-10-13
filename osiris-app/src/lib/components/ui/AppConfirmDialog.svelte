<script>
	import AppDialog from '$lib/components/ui/AppDialog.svelte';

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

	function handleCancel() {
		if (loading) return;
		open = false;
		oncancel();
	}

	function handleConfirm() {
		if (loading) return;
		onconfirm();
	}
</script>

<AppDialog
	bind:open
	{title}
	description={message}
	role="alertdialog"
	dismissible={!loading}
	onclose={oncancel}
>
	{#snippet footer()}
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={handleCancel}
				disabled={loading}
				class="btn min-h-11 w-full preset-outlined-surface-500 disabled:opacity-50"
			>
				{cancelLabel}
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={loading}
				class="btn min-h-11 w-full font-semibold focus:ring-2 focus:ring-offset-1 disabled:opacity-60 {confirmButtonClass}"
			>
				{loading ? 'Aguarde...' : confirmLabel}
			</button>
		</div>
	{/snippet}
</AppDialog>
