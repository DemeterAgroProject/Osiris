<script>
	import { resolve } from '$app/paths';
	import { ChevronRight } from 'lucide-svelte';
	import ProductCard from './ProductCard.svelte';

	let {
		title,
		subtitle = '',
		products = [],
		seeMoreHref = null,
		seeMoreLabel = 'Ver mais',
		limit = 6
	} = $props();

	const visibleProducts = $derived(products.slice(0, limit));
	const showSeeMore = $derived(Boolean(seeMoreHref) && products.length > 0);
</script>

{#if visibleProducts.length > 0}
	<section class="mx-auto w-full max-w-7xl py-4">
		<div class="flex items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
			<div class="min-w-0">
				<h2 class="preset-typo-title">{title}</h2>
				{#if subtitle}
					<p class="preset-typo-subtitle">{subtitle}</p>
				{/if}
			</div>
			{#if showSeeMore}
				<a
					href={resolve(seeMoreHref)}
					class="btn preset-tonal-primary shrink-0"
				>
					<span>{seeMoreLabel}</span>
					<ChevronRight size={18} />
				</a>
			{/if}
		</div>

		<div
			class="hide-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8"
			role="list"
			aria-label={title}
		>
			{#each visibleProducts as product (product.id)}
				<div class="w-44 shrink-0 snap-start sm:w-52" role="listitem">
					<ProductCard {...product} />
				</div>
			{/each}
		</div>
	</section>
{/if}
