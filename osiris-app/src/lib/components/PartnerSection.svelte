<script>
	import { Store, Eye } from 'lucide-svelte';

	const partners = [
		{ id: 1, name: 'Parceiro 1', views: 48 },
		{ id: 2, name: 'Parceiro 1', views: 48 },
		{ id: 3, name: 'Parceiro 2', views: 65 },
		{ id: 4, name: 'Parceiro 3', views: 32 }
	];
</script>

<section class="py-4">
	<div class="flex items-center justify-between px-4">
		<h2 class="text-lg font-bold text-gray-900">Lojas parceiras</h2>
		<button class="text-sm font-medium text-green-600 hover:text-green-700">Ver todos</button>
	</div>

	<div class="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar">
		{#each partners as partner (partner.id)}
			<div
				class="flex w-36 shrink-0 flex-col items-center rounded-xl border border-gray-200 bg-white p-4"
			>
				<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
					<Store class="h-7 w-7 text-gray-500" />
				</div>

				<h3 class="mt-3 text-sm font-medium text-gray-900">{partner.name}</h3>

				<div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
					<Eye class="h-3 w-3" />
					<span>{partner.views}</span>
				</div>

				<button
					class="mt-3 w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-green-500 hover:text-green-600"
				>
					Ver loja
				</button>
			</div>
		{/each}
	</div>
</section>
