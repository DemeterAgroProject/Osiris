<script>
	let {
		variant = 'grid',
		count = 6,
		sections = 1,
		label = 'Carregando conteúdo...'
	} = $props();
</script>

<div role="status" aria-live="polite" aria-busy="true">
	<span class="sr-only">{label}</span>

	{#if variant === 'carousel'}
		<div class="space-y-6 py-5">
			{#each Array(sections) as _, sectionIndex (sectionIndex)}
				<section class="space-y-4 px-4" aria-hidden="true">
					<div class="flex items-center justify-between gap-4">
						<div class="placeholder h-5 w-36 animate-pulse"></div>
						<div class="placeholder h-8 w-20 animate-pulse"></div>
					</div>
					<div class="hide-scrollbar flex gap-3 overflow-hidden">
						{#each Array(count) as _, index (index)}
							<article class="card w-40 shrink-0 overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 sm:w-48">
								<div class="placeholder aspect-[4/3] w-full animate-pulse rounded-none"></div>
								<div class="space-y-2 p-3">
									<div class="placeholder h-3 w-4/5 animate-pulse"></div>
									<div class="placeholder h-4 w-2/3 animate-pulse"></div>
									<div class="placeholder h-3 w-1/2 animate-pulse"></div>
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{:else if variant === 'list'}
		<div class="grid gap-3 lg:grid-cols-2" aria-hidden="true">
			{#each Array(count) as _, index (index)}
				<article class="card flex items-center gap-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4">
					<div class="placeholder size-16 shrink-0 animate-pulse rounded-container"></div>
					<div class="min-w-0 flex-1 space-y-2">
						<div class="placeholder h-4 w-3/4 animate-pulse"></div>
						<div class="placeholder h-3 w-1/2 animate-pulse"></div>
						<div class="placeholder h-3 w-2/3 animate-pulse"></div>
					</div>
					<div class="placeholder h-6 w-14 shrink-0 animate-pulse rounded-full"></div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
			{#each Array(count) as _, index (index)}
				<article class="card overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950">
					<div class="placeholder aspect-[4/3] w-full animate-pulse rounded-none"></div>
					<div class="space-y-2 p-3">
						<div class="placeholder h-3 w-4/5 animate-pulse"></div>
						<div class="placeholder h-4 w-2/3 animate-pulse"></div>
						<div class="placeholder h-3 w-1/2 animate-pulse"></div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
