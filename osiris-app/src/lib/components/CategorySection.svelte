<script>
	import { resolve } from '$app/paths';
	import { ArrowRight, Tractor, Leaf, Users } from 'lucide-svelte';

	// atalhos para a busca já filtrada pelo tipo de anúncio (ver filtersFromSearchParams em /buscar)
	const categories = [
		{ tipo: 'maquinario', label: 'Máquinas', hint: 'Tratores, colheitadeiras, plantadeiras e implementos', icon: Tractor, tone: 'preset-tonal-primary' },
		{ tipo: 'produto', label: 'Produtos e insumos', hint: 'Sementes, fertilizantes, defensivos e mudas', icon: Leaf, tone: 'preset-tonal-tertiary' },
		{ tipo: 'servico', label: 'Serviços', hint: 'Mão de obra e pacotes de serviço no campo', icon: Users, tone: 'preset-tonal-secondary' }
	];
</script>

<section class="mx-auto w-full max-w-7xl py-4" aria-labelledby="categories-title">
	<h2 id="categories-title" class="px-4 sm:px-6 lg:px-8 preset-typo-title">Categorias</h2>

	<div class="mt-3 grid grid-cols-3 gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
		{#each categories as category (category.tipo)}
			<a
				href={resolve(`/buscar?tipo=${category.tipo}`)}
				class="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 lg:min-h-48 lg:gap-3 lg:p-6"
			>
				<span class="flex h-12 w-12 items-center justify-center rounded-container lg:h-16 lg:w-16 transition-transform duration-200 group-hover:scale-105 {category.tone}">
					<category.icon class="h-6 w-6 lg:h-8 lg:w-8" aria-hidden="true" />
				</span>
				<span class="text-sm font-semibold leading-tight text-surface-950-50 lg:text-lg lg:font-bold">{category.label}</span>
				<span class="hidden max-w-xs preset-typo-body-2 text-surface-800-200 lg:block">{category.hint}</span>
				<span class="hidden items-center gap-1 text-sm font-semibold text-primary-700-300 lg:inline-flex">
					Explorar
					<ArrowRight size={16} />
				</span>
			</a>
		{/each}
	</div>
</section>
