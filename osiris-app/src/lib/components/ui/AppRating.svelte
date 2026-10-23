<script>
	import { RatingGroup } from '@skeletonlabs/skeleton-svelte';
	import { Star } from 'lucide-svelte';
	import { m } from '$lib/paraglide/messages';
	import { formatNumber } from '$lib/i18n';

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
		label = m.app_rating_nota()
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
	// nota com uma casa decimal no formato do idioma ("4,5" / "4.5")
	const valueText = $derived(formatNumber(clampedValue, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
</script>

{#snippet emptyStar()}
	<Star class="{iconClass} text-surface-700-300" />
{/snippet}

{#snippet halfStar()}
	<Star class="{iconClass} fill-warning-400 text-warning-400 opacity-80" />
{/snippet}

{#snippet fullStar()}
	<Star class="{iconClass}  {readOnly ? 'fill-warning-400 text-warning-400' : 'fill-current text-warning-500'}" />
{/snippet}

<div class="inline-flex flex-wrap items-center gap-1.5">
	<RatingGroup
		value={readOnly ? displayValue : clampedValue}
		onValueChange={(details) => (value = details.value)}
		{readOnly}
		allowHalf={readOnly}
		count={5}
		translations={{ ratingValueText: (index) => (index === 1 ? m.app_rating_estrela({ n: index }) : m.app_rating_estrelas({ n: index })) }}
		class="inline-flex gap-0"
	>
		<RatingGroup.Label class="sr-only">
			{readOnly ? m.app_rating_de_cinco({ label, valor: valueText }) : label}
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
		<span class="{textClass} font-semibold text-surface-950-50">{valueText}</span>
	{/if}

	{#if readOnly && showCount}
		<span class="{textClass} text-surface-800-200">
			{#if count === 1}
				{m.app_rating_uma_avaliacao()}
			{:else if count > 0}
				{m.app_rating_avaliacoes({ count })}
			{:else}
				{m.app_rating_sem_avaliacoes()}
			{/if}
		</span>
	{/if}
</div>
