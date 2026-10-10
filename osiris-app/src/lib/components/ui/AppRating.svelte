<script>
	import { RatingGroup } from '@skeletonlabs/skeleton-svelte';
	import { Star } from 'lucide-svelte';

	/**
	 * Nota de 1 a 5 sobre o Rating Group do Skeleton.
	 * readOnly (padrão): mostra a nota (meia estrela entre x.25 e x.75) e, opcionalmente,
	 * o valor e o número de avaliações. Com readOnly={false}, `value` é bindable para escolher a nota.
	 */
	let {
		value = $bindable(0),
		readOnly = true,
		count = 0,
		size = 'md',
		showCount = true,
		showValue = true,
		label = 'Nota'
	} = $props();

	const clampedValue = $derived(Math.min(5, Math.max(0, Number(value) || 0)));
	// arredonda para meia estrela: < .25 desce, < .75 vira meia, >= .75 sobe
	const displayValue = $derived.by(() => {
		const whole = Math.floor(clampedValue);
		const fraction = clampedValue - whole;
		if (fraction >= 0.75) return Math.min(5, whole + 1);
		if (fraction >= 0.25) return whole + 0.5;
		return whole;
	});

	const iconClass = $derived(
		!readOnly ? 'h-7 w-7' : size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
	);
	const textClass = $derived(size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm');
</script>

{#snippet emptyStar()}
	<Star class="{iconClass} text-surface-400-600" />
{/snippet}

{#snippet halfStar()}
	<Star class="{iconClass} fill-warning-400 text-warning-400 opacity-80" />
{/snippet}

{#snippet fullStar()}
	<Star class="{iconClass} {readOnly ? 'fill-warning-400 text-warning-400' : 'fill-current text-warning-500'}" />
{/snippet}

<div class="inline-flex flex-wrap items-center gap-1.5">
	<RatingGroup
		value={readOnly ? displayValue : clampedValue}
		onValueChange={(details) => (value = details.value)}
		{readOnly}
		allowHalf={readOnly}
		count={5}
		translations={{ ratingValueText: (index) => `${index} ${index === 1 ? 'estrela' : 'estrelas'}` }}
		class="inline-flex gap-0"
	>
		<RatingGroup.Label class="sr-only">
			{readOnly ? `${label} ${clampedValue.toFixed(1)} de 5` : label}
		</RatingGroup.Label>
		<RatingGroup.Control class="flex items-center {readOnly ? 'gap-0.5' : 'gap-1'}">
			<RatingGroup.Context>
				{#snippet children(ratingGroup)}
					{#each ratingGroup().items as index (index)}
						<RatingGroup.Item
							{index}
							empty={emptyStar}
							half={halfStar}
							full={fullStar}
							class={readOnly
								? ''
								: 'cursor-pointer rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40'}
						/>
					{/each}
				{/snippet}
			</RatingGroup.Context>
		</RatingGroup.Control>
	</RatingGroup>

	{#if readOnly && showValue && count > 0}
		<span class="{textClass} font-semibold text-surface-950-50">{clampedValue.toFixed(1)}</span>
	{/if}

	{#if readOnly && showCount}
		<span class="{textClass} text-surface-600-400">
			{#if count > 0}
				({count} {count === 1 ? 'avaliação' : 'avaliações'})
			{:else}
				(Sem avaliações)
			{/if}
		</span>
	{/if}
</div>
