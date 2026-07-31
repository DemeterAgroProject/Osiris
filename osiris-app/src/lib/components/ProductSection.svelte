<script>
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { Carousel } from '@skeletonlabs/skeleton-svelte';
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
	<Carousel
		slideCount={visibleProducts.length}
		autoSize
		allowMouseDrag
		spacing="12px"
		padding="16px"
		class="mx-auto w-full max-w-7xl py-5"
		aria-label={title}
	>
		<div class="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
			<h2 class="text-lg font-bold tracking-tight text-surface-950-50">{title}</h2>
			<div class="flex items-center gap-1">
				<Carousel.Control>
					<Carousel.PrevTrigger class="rounded-full p-2 text-surface-700-300 hover:preset-tonal disabled:opacity-40" aria-label="Produtos anteriores">
						<ChevronLeft class="size-4" />
					</Carousel.PrevTrigger>
					<Carousel.NextTrigger class="rounded-full p-2 text-surface-700-300 hover:preset-tonal disabled:opacity-40" aria-label="Próximos produtos">
						<ChevronRight class="size-4" />
					</Carousel.NextTrigger>
				</Carousel.Control>
				{#if showSeeMore}
				<a
					href={seeMoreHref}
					class="btn btn-sm shrink-0 preset-tonal-primary"
				>
					{seeMoreLabel}
				</a>
				{/if}
			</div>
		</div>

		<Carousel.ItemGroup class="mt-4 flex pb-3" aria-label={title}>
			{#each visibleProducts as product, index (product.id)}
				<Carousel.Item {index} class="w-40 shrink-0 sm:w-48 lg:w-56 xl:w-60">
					<ProductCard {...product} />
				</Carousel.Item>
			{/each}
		</Carousel.ItemGroup>
	</Carousel>
{/if}
