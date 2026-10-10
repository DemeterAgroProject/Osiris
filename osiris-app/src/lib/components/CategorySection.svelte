<script>
	import { Tractor, Leaf, FlaskConical, Wrench } from 'lucide-svelte';
	import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';

	let activeTab = $state('produtos');

	const categories = [
		{ id: 'maquinas', label: 'Máquinas', icon: Tractor },
		{ id: 'sementes', label: 'Sementes', icon: Leaf },
		{ id: 'insumos', label: 'Insumos', icon: FlaskConical },
		{ id: 'implementos', label: 'Implementos', icon: Wrench }
	];
</script>

<section class="mx-auto w-full max-w-7xl py-5" aria-labelledby="categories-title">
	<h2 id="categories-title" class="px-4 text-lg font-bold tracking-tight text-surface-950-50 sm:px-6 lg:px-8">Categorias</h2>

	<SegmentedControl value={activeTab} onValueChange={(details) => (activeTab = details.value)}>
		<SegmentedControl.Label class="sr-only">Tipo de categoria</SegmentedControl.Label>
		<SegmentedControl.Control class="relative mx-4 mt-3 grid grid-cols-2 gap-1 rounded-container bg-surface-100-900 p-1 sm:mx-6 lg:mx-8 lg:max-w-md">
			<SegmentedControl.Indicator class="rounded-container preset-filled-primary-500" />
			<SegmentedControl.Item value="produtos" class="relative z-10 min-h-10 cursor-pointer rounded-container px-4 py-2 text-center text-sm font-semibold text-surface-700-300 data-[state=checked]:text-white">
				<SegmentedControl.ItemText>Produtos</SegmentedControl.ItemText>
				<SegmentedControl.ItemHiddenInput />
			</SegmentedControl.Item>
			<SegmentedControl.Item value="servicos" class="relative z-10 min-h-10 cursor-pointer rounded-container px-4 py-2 text-center text-sm font-semibold text-surface-700-300 data-[state=checked]:text-white">
				<SegmentedControl.ItemText>Serviços</SegmentedControl.ItemText>
				<SegmentedControl.ItemHiddenInput />
			</SegmentedControl.Item>
		</SegmentedControl.Control>
	</SegmentedControl>

	<!-- Category grid -->
	<div class="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
		{#each categories as category (category.id)}
			<button
				type="button"
				class="card group flex min-h-28 flex-col items-center justify-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full preset-tonal-primary transition-transform duration-200 group-hover:scale-105">
					<category.icon class="h-6 w-6 text-primary-700-300" aria-hidden="true" />
				</div>
				<span class="text-sm font-medium text-surface-700-300">{category.label}</span>
			</button>
		{/each}
	</div>
</section>
