<script>
	import ProductCard from './ProductCard.svelte';

	let { title, products } = $props();
</script>

<section class="mx-auto w-full max-w-7xl pb-5 pt-1" aria-label={title}>
	<h2 class="sr-only">{title}</h2>

	<div class="grid grid-cols-2 gap-3 px-4 pb-2 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8 xl:grid-cols-5">
		{#each products as product (product.id)}
			<ProductCard {...product} />
		{:else}
			<p class="col-span-full rounded-container border border-dashed border-surface-300-700 p-8 text-center text-sm font-medium text-surface-900-100">
				Nenhum anúncio encontrado.
			</p>
		{/each}
	</div>
</section>
