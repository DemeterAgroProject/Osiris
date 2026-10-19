<script>
	/**
	 * Cards "de mentira" enquanto os dados carregam, no mesmo formato dos cards reais
	 * para a tela não pular quando o conteúdo chega.
	 * variant 'grid': ProductCard em grade (busca, favoritos).
	 * 'carousel': seções da Início (carrossel no celular, grade de 3 no computador).
	 * 'list': linhas de inventário, serviços e negociações (linha larga no computador).
	 * 'stats': cartões de resumo do topo (só no computador).
	 */
	let {
		variant = 'grid',
		count = 6,
		sections = 1,
		label = 'Carregando conteúdo...'
	} = $props();

	const sectionIndexes = $derived(Array.from({ length: sections }, (_, i) => i));
	const itemIndexes = $derived(Array.from({ length: count }, (_, i) => i));

	const bar = 'placeholder animate-pulse rounded-full';
</script>

{#snippet productCard()}
	<article class="flex h-full flex-col overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm">
		<div class="relative aspect-[4/3] w-full">
			<div class="placeholder h-full w-full animate-pulse rounded-none"></div>
			<div class="absolute left-2 top-2 h-6 w-20 rounded-full bg-surface-50-950/80"></div>
		</div>
		<div class="flex flex-1 flex-col gap-2 p-3">
			<div class="{bar} h-4 w-11/12"></div>
			<div class="{bar} h-4 w-2/3"></div>
			<div class="{bar} hidden h-3 w-4/5 lg:block"></div>
			<div class="{bar} mt-1 h-6 w-1/2"></div>
			<div class="{bar} mt-auto h-3 w-3/4"></div>
			<div class="{bar} h-3 w-1/3"></div>
			<div class="placeholder mt-2 hidden h-10 w-full animate-pulse rounded-base lg:block"></div>
		</div>
	</article>
{/snippet}

<div role="status" aria-live="polite" aria-busy="true">
	<span class="sr-only">{label}</span>

	{#if variant === 'carousel'}
		<div aria-hidden="true">
			{#each sectionIndexes as sectionIndex (sectionIndex)}
				<section class="mx-auto w-full max-w-7xl py-4">
					<div class="flex items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
						<div class="space-y-2">
							<div class="{bar} h-6 w-36"></div>
							<div class="{bar} h-3 w-52"></div>
						</div>
						<div class="placeholder h-9 w-24 animate-pulse rounded-base"></div>
					</div>
					<div class="hide-scrollbar mt-3 flex gap-3 overflow-hidden px-4 pb-2 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-5 lg:px-8">
						{#each itemIndexes as index (index)}
							<div class="w-44 shrink-0 sm:w-52 lg:w-auto">
								{@render productCard()}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{:else if variant === 'list'}
		<div class="space-y-3" aria-hidden="true">
			{#each itemIndexes as index (index)}
				<article class="flex gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-3 shadow-sm lg:items-center lg:gap-5 lg:p-4">
					<div class="placeholder h-24 w-24 shrink-0 animate-pulse rounded-container lg:h-28 lg:w-36"></div>
					<div class="flex min-w-0 flex-1 flex-col gap-2">
						<div class="flex items-start gap-2">
							<div class="flex-1 space-y-2">
								<div class="{bar} h-4 w-11/12"></div>
								<div class="{bar} h-4 w-1/2 lg:hidden"></div>
							</div>
							<div class="placeholder h-11 w-11 shrink-0 animate-pulse rounded-full lg:hidden"></div>
						</div>
						<div class="{bar} h-6 w-2/5 lg:hidden"></div>
						<div class="flex gap-2">
							<div class="{bar} h-6 w-20"></div>
							<div class="{bar} h-6 w-16"></div>
						</div>
						<div class="{bar} hidden h-3 w-1/2 lg:block"></div>
					</div>
					<div class="hidden shrink-0 flex-col items-end gap-2 lg:flex">
						<div class="{bar} h-3 w-20"></div>
						<div class="{bar} h-7 w-32"></div>
					</div>
					<div class="hidden shrink-0 items-center gap-2 lg:flex">
						<div class="placeholder h-10 w-24 animate-pulse rounded-base"></div>
						<div class="placeholder h-11 w-11 animate-pulse rounded-base"></div>
					</div>
				</article>
			{/each}
		</div>
	{:else if variant === 'stats'}
		<div class="hidden grid-cols-3 gap-4 lg:grid" aria-hidden="true">
			{#each itemIndexes as index (index)}
				<div class="flex items-center gap-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-5 shadow-sm">
					<div class="placeholder h-12 w-12 shrink-0 animate-pulse rounded-container"></div>
					<div class="flex-1 space-y-2">
						<div class="{bar} h-3 w-24"></div>
						<div class="{bar} h-7 w-12"></div>
						<div class="{bar} h-3 w-20"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5" aria-hidden="true">
			{#each itemIndexes as index (index)}
				{@render productCard()}
			{/each}
		</div>
	{/if}
</div>
