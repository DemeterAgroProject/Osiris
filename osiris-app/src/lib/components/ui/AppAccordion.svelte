<script>
	import { Accordion } from '@skeletonlabs/skeleton-svelte';
	import { ChevronDown } from 'lucide-svelte';

	/**
	 * Seção recolhível do Osiris sobre o Accordion do Skeleton (um item só).
	 * `open` começa aberto e é bindable; o conteúdo vai em `children`.
	 */
	let { title, open = $bindable(true), class: className = '', children } = $props();

	const ITEM = 'conteudo';
</script>

<Accordion
	value={open ? [ITEM] : []}
	onValueChange={(details) => (open = details.value.includes(ITEM))}
	collapsible
	class="overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm {className}"
>
	<Accordion.Item value={ITEM}>
		<Accordion.ItemTrigger
			class="flex min-h-14 w-full items-center justify-between gap-3 "
		>
			<span class="preset-typo-title">{title}</span>
			<Accordion.ItemIndicator class="text-primary-700-300 transition-transform duration-200 data-[state=open]:rotate-180">
				<ChevronDown class="h-6 w-6" />
			</Accordion.ItemIndicator>
		</Accordion.ItemTrigger>
		<Accordion.ItemContent class="p-4">
			{@render children?.()}
		</Accordion.ItemContent>
	</Accordion.Item>
</Accordion>
