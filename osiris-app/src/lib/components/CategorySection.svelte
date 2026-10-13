<script>
	import { resolve } from '$app/paths';
	import { Tractor, Leaf, Users } from 'lucide-svelte';

	// atalhos para a busca já filtrada pelo tipo de anúncio (ver filtersFromSearchParams em /buscar)
	const categories = [
		{ tipo: 'maquinario', label: 'Máquinas', icon: Tractor },
		{ tipo: 'produto', label: 'Produtos e insumos', icon: Leaf },
		{ tipo: 'servico', label: 'Serviços', icon: Users }
	];
</script>

<section class="mx-auto w-full max-w-7xl py-5" aria-labelledby="categories-title">
	<h2 id="categories-title" class="px-4 text-lg font-bold tracking-tight text-surface-950-50 sm:px-6 lg:px-8">Categorias</h2>

	<div class="mt-4 grid grid-cols-3 gap-3 px-4 sm:px-6 lg:max-w-2xl lg:px-8">
		{#each categories as category (category.tipo)}
			<a
				href={resolve(`/buscar?tipo=${category.tipo}`)}
				class="card group flex min-h-28 flex-col items-center justify-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full preset-tonal-primary transition-transform duration-200 group-hover:scale-105">
					<category.icon class="h-6 w-6 text-primary-700-300" aria-hidden="true" />
				</div>
				<span class="text-sm font-medium text-surface-700-300">{category.label}</span>
			</a>
		{/each}
	</div>
</section>
