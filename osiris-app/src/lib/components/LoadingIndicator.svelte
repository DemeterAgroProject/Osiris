<script>
	import { Progress } from '@skeletonlabs/skeleton-svelte';

	let {
		label = 'Carregando...',
		size = '2rem',
		compact = false,
		showLabel = true,
		className = ''
	} = $props();
</script>

<div
	class="flex items-center justify-center {compact ? 'gap-2' : 'flex-col gap-3'} {className}"
	role="status"
	aria-live="polite"
>
	<Progress value={null} class="items-center">
		<Progress.Circle style="--size: {size}; --thickness: 0.18rem;">
			<Progress.CircleTrack class="stroke-surface-200-800" />
			<Progress.CircleRange class="stroke-primary-500" />
		</Progress.Circle>
	</Progress>
	{#if showLabel}
		<span class="text-sm font-medium text-surface-700-300">{label}</span>
	{:else}
		<span class="sr-only">{label}</span>
	{/if}
</div>
