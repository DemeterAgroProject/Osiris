<script>
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		open = $bindable(false),
		title = m.comum_confirmar(),
		message = '',
		confirmLabel = m.comum_confirmar(),
		cancelLabel = m.comum_cancelar(),
		loading = false,
		variant = 'default',
		onconfirm = () => {},
		oncancel = () => {}
	} = $props();

	const confirmButtonClass = $derived(
		variant === 'danger'
			? 'preset-filled-error-500'
			: variant === 'warning'
				? 'preset-filled-warning-500'
				: 'preset-filled-primary-500'
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
				class="btn btn-md preset-tonal w-full"
			>
				{cancelLabel}
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={loading}
				class="btn btn-md w-full {confirmButtonClass}"
			>
				<span>{loading ? m.app_aguarde() : confirmLabel}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>
