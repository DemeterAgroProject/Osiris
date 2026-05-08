<script>
	import ProductCard from './ProductCard.svelte';

	let { title, products } = $props();
</script>

<section class="py-4">
	<div class="flex items-center justify-between px-4">
		<h2 class="text-lg font-bold text-green-700">{title}</h2>
		<button class="text-sm font-medium text-green-600 hover:text-green-700">Ver todos</button>
	</div>

	<div class="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar">
		{#each products as product (product.id)}
			<div class="w-44 shrink-0 md:w-52">
				<ProductCard {...product} />
			</div>
		{/each}
	</div>
</section>
