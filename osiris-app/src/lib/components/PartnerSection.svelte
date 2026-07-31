<script>
	import { Store, Eye } from 'lucide-svelte';

	const partners = [
		{ id: 1, name: 'Parceiro 1', views: 48 },
		{ id: 2, name: 'Parceiro 1', views: 48 },
		{ id: 3, name: 'Parceiro 2', views: 65 },
		{ id: 4, name: 'Parceiro 3', views: 32 }
	];
</script>

<section class="py-5" aria-labelledby="partners-title">
	<div class="flex items-center justify-between px-4">
		<h2 id="partners-title" class="text-lg font-bold tracking-tight text-surface-950-50">Lojas parceiras</h2>
		<button type="button" class="btn btn-sm preset-tonal-primary">Ver todos</button>
	</div>

	<div class="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar">
		{#each partners as partner (partner.id)}
			<div
				class="card flex w-36 shrink-0 snap-start flex-col items-center rounded-container border border-surface-200-800 bg-surface-50-950 p-4 "
			>
				<div class="flex h-14 w-14 items-center justify-center rounded-container bg-surface-100-900">
					<Store class="h-7 w-7 text-primary-600-400" aria-hidden="true" />
				</div>

				<h3 class="mt-3 text-sm font-medium text-surface-950-50">{partner.name}</h3>

				<div class="mt-1 flex items-center gap-1 text-xs text-surface-700-300">
					<Eye class="h-3 w-3" aria-hidden="true" />
					<span>{partner.views}</span>
				</div>

				<button
					type="button"
					class="btn btn-sm mt-3 w-full preset-outlined-primary-500"
				>
					Ver loja
				</button>
			</div>
		{/each}
	</div>
</section>
