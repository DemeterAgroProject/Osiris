<script>
	import { resolve } from '$app/paths';
	import { Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { ChevronRight } from 'lucide-svelte';

	/**
	 * Menu do Osiris sobre o Menu do Skeleton.
	 * Cada item: { value, label, icon?, href?, onselect?, disabled?, danger?, separator? }.
	 * Com `href` o item vira link (caminho interno, passado por resolve());
	 * sem `href`, `onselect` é chamado ao escolher o item.
	 * `separator` desenha uma linha antes do item.
	 * variant 'compact': ações de um item (três pontos); 'nav': menu de navegação, com seta nos links.
	 */
	let {
		items = [],
		open = $bindable(false),
		label = 'Abrir menu',
		placement = 'bottom-end',
		variant = 'compact',
		triggerClass = '',
		contentClass = 'w-48',
		trigger,
		header
	} = $props();

	function handleSelect(details) {
		items.find((item) => item.value === details.value)?.onselect?.();
	}

	function itemClass(item) {
		const layout = variant === 'nav' ? 'gap-3' : 'gap-2';
		const tone = item.danger
			? 'font-medium text-error-500 data-[highlighted]:preset-tonal-error'
			: variant === 'nav'
				? 'text-surface-950-50 data-[highlighted]:preset-tonal'
				: 'text-surface-700-300 data-[highlighted]:preset-tonal';
		return `justify-start rounded-none px-4 py-3 text-sm ${layout} ${tone}`;
	}
</script>

{#snippet itemBody(item)}
	{#if item.icon}
		<item.icon
			class="shrink-0 {variant === 'nav' ? 'h-5 w-5' : 'h-4 w-4'} {variant === 'nav' && !item.danger
				? 'text-surface-600-400'
				: ''}"
		/>
	{/if}
	<span class="flex-1 {variant === 'nav' ? 'font-medium' : ''}">{item.label}</span>
	{#if variant === 'nav' && item.href}
		<ChevronRight class="h-4 w-4 text-surface-400-600" />
	{/if}
{/snippet}

<Menu
	{open}
	onOpenChange={(details) => (open = details.open)}
	onSelect={handleSelect}
	positioning={{ placement }}
>
	<Menu.Trigger class={triggerClass} aria-label={label}>
		{@render trigger?.()}
	</Menu.Trigger>
	<Portal>
		<Menu.Positioner>
			<Menu.Content
				class="relative z-[60] min-w-0 gap-0 overflow-hidden rounded-container p-0 py-1 shadow-2xl outline-none {contentClass}"
			>
				{@render header?.()}
				{#each items as item (item.value)}
					{#if item.separator}
						<Menu.Separator class="{variant === 'nav' ? 'my-1' : 'my-0'} border-surface-200-800" />
					{/if}
					{#if item.href}
						<Menu.Item
							value={item.value}
							disabled={item.disabled}
							class={itemClass(item)}
						>
							{#snippet element(attributes)}
								<a {...attributes} href={resolve(item.href)}>
									{@render itemBody(item)}
								</a>
							{/snippet}
						</Menu.Item>
					{:else}
						<Menu.Item
							value={item.value}
							disabled={item.disabled}
							class={itemClass(item)}
						>
							{@render itemBody(item)}
						</Menu.Item>
					{/if}
				{/each}
			</Menu.Content>
		</Menu.Positioner>
	</Portal>
</Menu>
