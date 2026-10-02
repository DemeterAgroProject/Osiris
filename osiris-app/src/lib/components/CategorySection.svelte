<script>
	import { Tractor, Leaf, FlaskConical, Wrench } from 'lucide-svelte';

	let activeTab = $state('produtos');

	const categories = [
		{ id: 'maquinas', label: 'Máquinas', icon: Tractor },
		{ id: 'sementes', label: 'Sementes', icon: Leaf },
		{ id: 'insumos', label: 'Insumos', icon: FlaskConical },
		{ id: 'implementos', label: 'Implementos', icon: Wrench }
	];
</script>

<section class="py-4">
	<h2 class="px-4 text-lg font-bold text-surface-950-50">Categorias</h2>

	<!-- Tabs -->
	<div class="mt-3 flex gap-2 px-4">
		<button
			onclick={() => (activeTab = 'produtos')}
			class="flex-1 rounded-container border-2 py-2.5 text-sm font-medium transition-colors {activeTab === 'produtos'
				? 'preset-filled-primary-500 border-primary-500'
				: 'border-surface-200-800 bg-surface-50-950 text-surface-600-400 hover:border-surface-200-800'}"
		>
			Produtos
		</button>
		<button
			onclick={() => (activeTab = 'servicos')}
			class="flex-1 rounded-container border-2 py-2.5 text-sm font-medium transition-colors {activeTab === 'servicos'
				? 'preset-filled-primary-500 border-primary-500'
				: 'border-surface-200-800 bg-surface-50-950 text-surface-600-400 hover:border-surface-200-800'}"
		>
			Serviços
		</button>
	</div>

	<!-- Category grid -->
	<div class="mt-4 grid grid-cols-2 gap-3 px-4">
		{#each categories as category (category.id)}
			<button
				class="flex flex-col items-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all hover:border-primary-500 hover:shadow-sm"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-100-900">
					<category.icon class="h-6 w-6 text-surface-600-400" />
				</div>
				<span class="text-sm font-medium text-surface-700-300">{category.label}</span>
			</button>
		{/each}
	</div>
</section>
