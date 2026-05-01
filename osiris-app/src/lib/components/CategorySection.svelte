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
	<h2 class="px-4 text-lg font-bold text-gray-900">Categorias</h2>

	<!-- Tabs -->
	<div class="mt-3 flex gap-2 px-4">
		<button
			onclick={() => (activeTab = 'produtos')}
			class="flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors {activeTab === 'produtos'
				? 'border-green-600 bg-green-600 text-white'
				: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}"
		>
			Produtos
		</button>
		<button
			onclick={() => (activeTab = 'servicos')}
			class="flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors {activeTab === 'servicos'
				? 'border-green-600 bg-green-600 text-white'
				: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}"
		>
			Serviços
		</button>
	</div>

	<!-- Category grid -->
	<div class="mt-4 grid grid-cols-2 gap-3 px-4">
		{#each categories as category (category.id)}
			<button
				class="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-green-500 hover:shadow-sm"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
					<svelte:component this={category.icon} class="h-6 w-6 text-gray-600" />
				</div>
				<span class="text-sm font-medium text-gray-700">{category.label}</span>
			</button>
		{/each}
	</div>
</section>
