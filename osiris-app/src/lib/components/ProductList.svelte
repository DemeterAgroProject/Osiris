<script>
	import ProductCard from './ProductCard.svelte';
	import { m } from '$lib/paraglide/messages';

	let { title, products } = $props();
</script>

<section class="w-full pb-5 pt-1" aria-label={title}>
	<h2 class="sr-only">{title}</h2>

	<div class="grid grid-cols-2 gap-3 px-4 pb-2 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:gap-5 lg:px-0">
		{#each products as product (product.id)}
			<ProductCard {...product} />
		{:else}
			<p class="col-span-full rounded-container border border-dashed border-surface-300-700 p-8 text-center text-sm font-medium text-surface-900-100">
				{m.busca_nenhum_anuncio()}
			</p>
		{/each}
	</div>
</section>
