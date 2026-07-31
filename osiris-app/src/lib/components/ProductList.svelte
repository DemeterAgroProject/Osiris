<script>
	import ProductCard from './ProductCard.svelte';

	let { title, products } = $props();
</script>

<section class="py-5" aria-label={title}>
	<div class="flex items-center justify-between px-4">
		<h2 class="text-lg font-bold tracking-tight text-surface-950-50">{title}</h2>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-3 px-4 pb-2 sm:gap-4 lg:grid-cols-3">
		{#each products as product (product.id)}
			<ProductCard {...product} />
		{:else}
			<p class="card col-span-full rounded-container border border-dashed border-surface-300-700 p-8 text-center text-sm font-medium text-surface-700-300">
				Nenhum anúncio encontrado.
			</p>
		{/each}
	</div>
</section>
