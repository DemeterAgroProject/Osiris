<script>
	import { RatingGroup } from '@skeletonlabs/skeleton-svelte';
	import { Star } from 'lucide-svelte';

	let {
		value = $bindable(0),
		count = 0,
		size = 'md',
		showCount = true,
		showValue = true,
		readOnly = true,
		allowHalf = true,
		onchange = () => {}
	} = $props();

	const clampedValue = $derived(Math.min(5, Math.max(0, Number(value) || 0)));
	const iconClass = $derived(
		size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
	);
	const textClass = $derived(
		size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
	);

	function handleValueChange(details) {
		if (readOnly) return;
		value = details.value;
		onchange(details.value);
	}
</script>

<div class="inline-flex flex-wrap items-center gap-1.5">
	<RatingGroup
		count={5}
		value={clampedValue}
		{allowHalf}
		{readOnly}
		onValueChange={handleValueChange}
	>
		<RatingGroup.Control class="flex items-center gap-0.5" aria-label="Nota {clampedValue.toFixed(1)} de 5">
			<RatingGroup.Context>
				{#snippet children(ratingGroup)}
					{#each ratingGroup().items as index (index)}
						<RatingGroup.Item {index}>
							{#snippet empty()}<Star class="{iconClass} text-surface-700-300" />{/snippet}
							{#snippet half()}<Star class="{iconClass} fill-warning-400 text-warning-400 opacity-80" />{/snippet}
							{#snippet full()}<Star class="{iconClass} fill-warning-400 text-warning-400" />{/snippet}
						</RatingGroup.Item>
					{/each}
				{/snippet}
			</RatingGroup.Context>
		</RatingGroup.Control>
		<RatingGroup.HiddenInput />
	</RatingGroup>

	{#if showValue && (count > 0 || !readOnly)}
		<span class="{textClass} font-semibold text-surface-950-50">{clampedValue.toFixed(1)}</span>
	{/if}

	{#if showCount}
		<span class="{textClass} text-surface-700-300">
			{#if count > 0}
				({count} {count === 1 ? 'avaliação' : 'avaliações'})
			{:else}
				(Sem avaliações)
			{/if}
		</span>
	{/if}
</div>
