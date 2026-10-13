<script>
	import ProductCard from './ProductCard.svelte';

	let { title, products } = $props();
</script>

<section class="mx-auto w-full max-w-7xl py-5" aria-label={title}>
	<div class="flex items-center justify-between px-4 sm:px-6 lg:px-8">
		<h2 class="text-lg font-bold tracking-tight text-surface-950-50">{title}</h2>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-3 px-4 pb-2 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8 xl:grid-cols-5">
		{#each products as product (product.id)}
			<ProductCard {...product} />
		{:else}
			<p class="card col-span-full rounded-container border border-dashed border-surface-300-700 p-8 text-center text-sm font-medium text-surface-700-300">
				Nenhum anúncio encontrado.
			</p>
		{/each}
	</div>
</section>
