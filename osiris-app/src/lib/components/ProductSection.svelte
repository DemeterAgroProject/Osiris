<script>
	import ProductCard from './ProductCard.svelte';

	let {
		title,
		products = [],
		seeMoreHref = null,
		seeMoreLabel = 'Ver mais',
		limit = 6
	} = $props();

	const visibleProducts = $derived(products.slice(0, limit));
	const showSeeMore = $derived(Boolean(seeMoreHref) && products.length > 0);
</script>

{#if visibleProducts.length > 0}
	<section class="py-3">
		<div class="flex items-center justify-between gap-3 px-4">
			<h2 class="text-lg font-bold text-green-700">{title}</h2>
			{#if showSeeMore}
				<a
					href={seeMoreHref}
					class="shrink-0 text-sm font-semibold text-green-600 transition-colors hover:text-green-700"
				>
					{seeMoreLabel}
				</a>
			{/if}
		</div>

		<div
			class="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
			role="list"
			aria-label={title}
		>
			{#each visibleProducts as product (product.id)}
				<div class="w-40 shrink-0 snap-start sm:w-44" role="listitem">
					<ProductCard {...product} />
				</div>
			{/each}
		</div>
	</section>
{/if}
