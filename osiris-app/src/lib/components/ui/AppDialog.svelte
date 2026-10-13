<script>
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { X } from 'lucide-svelte';

	/**
	 * Diálogo do Osiris sobre o Dialog do Skeleton.
	 * - variant 'modal': cartão centralizado (no celular, colado embaixo).
	 * - variant 'sheet': gaveta inferior no celular, modal a partir de `sm`.
	 * O corpo rola dentro do diálogo; o rodapé (`footer`) fica sempre visível.
	 * Para enviar um formulário pelo rodapé, use `<button type="submit" form="id-do-form">`.
	 */
	let {
		open = $bindable(false),
		title = '',
		description = '',
		variant = 'modal',
		size = 'sm',
		role = 'dialog',
		dismissible = true,
		closeLabel = 'Fechar',
		onclose = () => {},
		children,
		footer
	} = $props();

	const sizeClass = $derived(
		{ sm: 'sm:max-w-sm', md: 'sm:max-w-2xl', lg: 'sm:max-w-3xl' }[size] ?? 'sm:max-w-sm'
	);

	function handleOpenChange(details) {
		const wasOpen = open;
		open = details.open;
		if (!details.open && wasOpen) onclose();
	}
</script>

<Dialog
	{open}
	onOpenChange={handleOpenChange}
	closeOnEscape={dismissible}
	closeOnInteractOutside={dismissible}
	{role}
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[100] bg-surface-950/50 backdrop-blur-sm" />
		<Dialog.Positioner
			class="fixed inset-0 z-[101] flex items-end justify-center {variant === 'sheet'
				? 'sm:items-center sm:p-6'
				: 'p-4 sm:items-center'}"
		>
			<Dialog.Content
				class="flex w-full flex-col overflow-hidden bg-surface-50-950 outline-none {sizeClass} {variant ===
				'sheet'
					? 'max-h-[92dvh] rounded-t-3xl sm:rounded-container sm:border sm:border-surface-200-800'
					: 'max-h-[calc(100dvh-2rem)] max-w-sm rounded-container border border-surface-200-800 shadow-2xl'}"
			>
				{#if open}
					<div
						class="flex shrink-0 items-start justify-between gap-3 {variant === 'sheet'
							? 'border-b border-surface-200-800 px-4 py-4'
							: 'px-5 pt-5'}"
					>
						<div class="min-w-0 flex-1">
							<Dialog.Title class="text-lg font-bold text-surface-950-50">{title}</Dialog.Title>
							{#if description}
								<Dialog.Description
									class={variant === 'sheet'
										? 'text-xs text-surface-600-400'
										: 'mt-2 text-sm leading-relaxed text-surface-700-300'}
								>
									{description}
								</Dialog.Description>
							{/if}
						</div>
						<Dialog.CloseTrigger
							disabled={!dismissible}
							class="btn-icon shrink-0 rounded-full text-surface-700-300 hover:preset-tonal disabled:opacity-50"
							aria-label={closeLabel}
						>
							<X class="h-5 w-5" />
						</Dialog.CloseTrigger>
					</div>

					{#if children}
						<div
							class="min-h-0 flex-1 overflow-y-auto overscroll-contain {variant === 'sheet'
								? 'px-4 py-4'
								: `px-5 pt-4 ${footer ? '' : 'pb-5'}`}"
						>
							{@render children()}
						</div>
					{/if}

					{#if footer}
						<div
							class="shrink-0 {variant === 'sheet'
								? 'border-t border-surface-200-800 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]'
								: `px-5 pb-5 ${children ? 'pt-5' : 'pt-4'}`}"
						>
							{@render footer()}
						</div>
					{/if}
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
