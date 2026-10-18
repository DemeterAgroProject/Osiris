<script>
	import { Accordion } from '@skeletonlabs/skeleton-svelte';
	import { ChevronDown } from 'lucide-svelte';

	/**
	 * Seção recolhível do Osiris sobre o Accordion do Skeleton (um item só).
	 * `open` começa aberto e é bindable; o conteúdo vai em `children`.
	 * variant 'card': cartão com borda e título de seção (detalhes do anúncio).
	 * 'section': sem cartão, título curto e linha separadora (grupos de filtro).
	 * badge: texto curto ao lado do título (ex.: quantos filtros estão marcados).
	 */
	let {
		title,
		open = $bindable(true),
		variant = 'card',
		badge = '',
		class: className = '',
		children
	} = $props();

	const ITEM = 'conteudo';

	const rootClass = {
		card: 'overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm',
		section: 'border-b border-surface-200-800 last:border-b-0'
	};
	const triggerClass = {
		card: 'flex min-h-14 w-full items-center justify-between gap-3 ',
		section: 'flex min-h-12 w-full items-center justify-between gap-2 px-0! py-2 text-left'
	};
	const contentClass = { card: 'p-4', section: 'px-0! pt-1! pb-4!' };
</script>

<Accordion
	value={open ? [ITEM] : []}
	onValueChange={(details) => (open = details.value.includes(ITEM))}
	collapsible
	class="{rootClass[variant] ?? rootClass.card} {className}"
>
	<Accordion.Item value={ITEM}>
		<Accordion.ItemTrigger class={triggerClass[variant] ?? triggerClass.card}>
			<span class="flex min-w-0 items-center gap-2">
				<span class={variant === 'section' ? 'text-base font-semibold text-surface-950-50' : 'preset-typo-title'}>{title}</span>
				{#if badge}
					<span class="badge rounded-full preset-filled-primary-500 px-2 py-0.5 text-xs font-bold">{badge}</span>
				{/if}
			</span>
			<Accordion.ItemIndicator class="text-primary-700-300 transition-transform duration-200 data-[state=open]:rotate-180">
				<ChevronDown class={variant === 'section' ? 'h-5 w-5' : 'h-6 w-6'} />
			</Accordion.ItemIndicator>
		</Accordion.ItemTrigger>
		<Accordion.ItemContent class={contentClass[variant] ?? contentClass.card}>
			{@render children?.()}
		</Accordion.ItemContent>
	</Accordion.Item>
</Accordion>
