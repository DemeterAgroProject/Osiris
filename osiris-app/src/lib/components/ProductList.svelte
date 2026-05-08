<script>
	import ProductCard from './ProductCard.svelte';

	let { title, products } = $props();
</script>

<section class="py-4">
	<div class="flex items-center justify-between px-4">
		<h2 class="text-lg font-bold text-green-700">{title}</h2>
	</div>

	<div class="mt-3 grid grid-cols-2 gap-3 px-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each products as product (product.id)}
			<ProductCard {...product} />
		{:else}
			<p class="py-6 text-center text-sm text-gray-500 sm:col-span-2 lg:col-span-3">
				Nenhum anúncio encontrado.
			</p>
		{/each}
	</div>
</section>
