<script>
	import { Star } from 'lucide-svelte';

	let {
		value = 0,
		count = 0,
		size = 'md',
		showCount = true,
		showValue = true
	} = $props();

	const clampedValue = $derived(Math.min(5, Math.max(0, Number(value) || 0)));
	const fullStars = $derived(Math.floor(clampedValue));
	const hasHalfStar = $derived(clampedValue - fullStars >= 0.25 && clampedValue - fullStars < 0.75);
	const extraFullFromHalf = $derived(clampedValue - fullStars >= 0.75 ? 1 : 0);
	const totalFull = $derived(Math.min(5, fullStars + extraFullFromHalf));

	const iconClass = $derived(
		size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
	);
	const textClass = $derived(
		size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
	);
</script>

<div class="inline-flex flex-wrap items-center gap-1.5">
	<div class="flex items-center gap-0.5" aria-label="Nota {clampedValue.toFixed(1)} de 5">
		{#each Array(5) as _, index}
			{@const filled = index < totalFull}
			{@const half = !filled && hasHalfStar && index === totalFull}
			<Star
				class="{iconClass} {filled || half
					? 'fill-amber-400 text-amber-400'
					: 'text-gray-300'} {half ? 'opacity-80' : ''}"
			/>
		{/each}
	</div>

	{#if showValue && count > 0}
		<span class="{textClass} font-semibold text-gray-800">{clampedValue.toFixed(1)}</span>
	{/if}

	{#if showCount}
		<span class="{textClass} text-gray-500">
			{#if count > 0}
				({count} {count === 1 ? 'avaliação' : 'avaliações'})
			{:else}
				(Sem avaliações)
			{/if}
		</span>
	{/if}
</div>
