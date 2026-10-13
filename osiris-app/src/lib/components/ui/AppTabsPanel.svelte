<script>
	import { Tabs } from '@skeletonlabs/skeleton-svelte';

	// painel de um AppTabs; só renderiza o conteúdo da aba ativa
	let { value, class: className = '', children } = $props();
</script>

{#snippet panel(tabs)}
	{#if tabs().value === value}
		{@render children?.()}
	{/if}
{/snippet}

<Tabs.Content
	{value}
	class="rounded-container outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 {className}"
>
	<Tabs.Context children={panel} />
</Tabs.Content>
