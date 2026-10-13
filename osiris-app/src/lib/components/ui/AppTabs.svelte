<script>
	import { Tabs } from '@skeletonlabs/skeleton-svelte';

	/**
	 * Abas do Osiris sobre o Tabs do Skeleton.
	 * items: { value, label, icon? }. Os painéis são AppTabsPanel dentro de `children`;
	 * o que vier antes deles (busca etc.) aparece em todas as abas.
	 * variant 'cards': botões com borda (inventário);
	 * 'segmented': trilho cinza com a aba ativa clara (serviços);
	 * 'filled': aba ativa preenchida com a cor primária (negociações).
	 */
	let {
		value = $bindable(''),
		items = [],
		label = '',
		variant = 'filled',
		class: className = '',
		children
	} = $props();

	const listClass = {
		cards: 'flex gap-2',
		segmented: 'flex rounded-container bg-surface-200-800 p-1',
		filled: 'flex gap-2 rounded-container bg-surface-50-950 p-1 shadow-sm ring-1 ring-surface-200-800'
	};

	const triggerClass = {
		cards:
			'flex flex-1 items-center justify-center gap-2 rounded-container border-2 border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm font-medium text-surface-600-400 transition-all hover:border-primary-500 data-[selected]:border-primary-500 data-[selected]:preset-tonal-primary data-[selected]:text-primary-700',
		segmented:
			'flex flex-1 items-center justify-center gap-2 rounded-container bg-transparent py-2.5 text-sm font-medium text-surface-600-400 transition-all hover:bg-transparent hover:text-surface-950-50 data-[selected]:bg-surface-50-950 data-[selected]:text-primary-700 data-[selected]:shadow-sm',
		filled:
			'flex flex-1 items-center justify-center gap-2 rounded-container py-2.5 text-sm font-semibold text-surface-600-400 transition-colors not-data-[selected]:hover:preset-tonal data-[selected]:preset-filled-primary-500'
	};
</script>

<Tabs {value} onValueChange={(details) => (value = details.value)} class={className}>
	<Tabs.List
		class="m-0 border-0 p-0 {listClass[variant] ?? listClass.filled}"
		aria-label={label || undefined}
	>
		{#each items as item (item.value)}
			<Tabs.Trigger value={item.value} class="h-auto {triggerClass[variant] ?? triggerClass.filled}">
				{#if item.icon}
					<item.icon class={variant === 'cards' ? 'h-5 w-5' : 'h-4 w-4'} />
				{/if}
				{item.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
	{@render children?.()}
</Tabs>
