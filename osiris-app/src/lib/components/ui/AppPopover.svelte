<script>
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';

	/**
	 * Popover do Osiris sobre o Popover do Skeleton.
	 * `trigger` é o conteúdo do botão; `actions` fica à direita do título.
	 */
	let {
		open = $bindable(false),
		title = '',
		label = '',
		placement = 'bottom-end',
		triggerClass = '',
		contentClass = 'w-80',
		trigger,
		actions,
		children
	} = $props();
</script>

<Popover {open} onOpenChange={(details) => (open = details.open)} positioning={{ placement }}>
	<Popover.Trigger class={triggerClass} aria-label={label || title}>
		{@render trigger?.()}
	</Popover.Trigger>
	<Portal>
		<Popover.Positioner>
			<Popover.Content
				class="relative z-[60] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-lg outline-none {contentClass}"
			>
				{#if title}
					<div class="flex items-center justify-between gap-3 border-b border-surface-200-800 px-4 py-3">
						<Popover.Title class="text-sm font-semibold text-surface-950-50">
							{#snippet element(attributes)}
								<h2 {...attributes}>{title}</h2>
							{/snippet}
						</Popover.Title>
						{@render actions?.()}
					</div>
				{/if}
				{@render children?.()}
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>
