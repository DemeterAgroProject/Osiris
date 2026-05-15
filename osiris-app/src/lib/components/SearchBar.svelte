<script>
	import { Search, SlidersHorizontal, X, ChevronDown, Check } from 'lucide-svelte';

	function createDefaultFilters() {
		return {
			status: '',
			sort: 'recentes',
			minPrice: '',
			maxPrice: '',
			brandIds: [],
			typeIds: [],
			categories: [],
			minYear: '',
			maxYear: '',
			minHorimeter: '',
			maxHorimeter: ''
		};
	}

	function cloneFilters(source) {
		return {
			...createDefaultFilters(),
			...source,
			brandIds: [...(source?.brandIds ?? [])],
			typeIds: [...(source?.typeIds ?? [])],
			categories: [...(source?.categories ?? [])]
		};
	}

	let {
		searchQuery = $bindable(''),
		filters = $bindable(createDefaultFilters()),
		mode = 'maquinarios',
		options = { brands: [], types: [], categories: [] },
		placeholder = 'Buscar...'
	} = $props();

	let isFilterOpen = $state(false);
	let draftFilters = $state(createDefaultFilters());

	const statusOptions = [
		{ id: '', label: 'Todos' },
		{ id: 'Ativo', label: 'Ativo' },
		{ id: 'Inativo', label: 'Inativo' },
		{ id: 'Pausado', label: 'Pausado' }
	];

	const sortOptions = [
		{ id: 'recentes', label: 'Mais recentes' },
		{ id: 'nome-asc', label: 'Nome (A-Z)' },
		{ id: 'nome-desc', label: 'Nome (Z-A)' },
		{ id: 'preco-asc', label: 'Menor preço' },
		{ id: 'preco-desc', label: 'Maior preço' }
	];

	function openFilters() {
		draftFilters = cloneFilters(filters);
		isFilterOpen = true;
	}

	function closeFilters() {
		isFilterOpen = false;
	}

	function clearDraftFilters() {
		draftFilters = createDefaultFilters();
	}

	function applyFilters() {
		filters = cloneFilters(draftFilters);
		isFilterOpen = false;
	}

	function toggleArrayItem(key, id) {
		const values = draftFilters[key];
		if (values.includes(id)) {
			draftFilters = { ...draftFilters, [key]: values.filter((value) => value !== id) };
		} else {
			draftFilters = { ...draftFilters, [key]: [...values, id] };
		}
	}

	function activeFilterCount(filterState) {
		let count = 0;

		if (filterState.status) count++;
		if (filterState.minPrice || filterState.maxPrice) count++;

		if (mode === 'maquinarios') {
			if (filterState.brandIds.length) count++;
			if (filterState.typeIds.length) count++;
			if (filterState.minYear || filterState.maxYear) count++;
			if (filterState.minHorimeter || filterState.maxHorimeter) count++;
		}

		if (mode === 'produtos' && filterState.categories.length) count++;

		return count;
	}

	const appliedFilterCount = $derived(activeFilterCount(filters));
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && isFilterOpen) closeFilters();
	}}
/>

<div class="space-y-3 px-4 py-3">
	<div class="flex items-center gap-2">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={placeholder}
				class="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
			/>
		</div>

		<button
			onclick={openFilters}
			class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-green-500 hover:text-green-600"
			aria-label="Abrir filtros"
		>
			<SlidersHorizontal class="h-5 w-5" />
			{#if appliedFilterCount > 0}
				<span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-semibold text-white">
					{appliedFilterCount}
				</span>
			{/if}
		</button>
	</div>
</div>

{#if isFilterOpen}
	<button
		type="button"
		class="fixed inset-0 z-[70] border-0 bg-black/30 p-0"
		onclick={closeFilters}
		aria-label="Fechar filtros"
	></button>
	<div class="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl bg-white shadow-2xl">
		<div class="mx-auto flex max-h-[85vh] w-full max-w-3xl flex-col px-4 pt-4">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-base font-semibold text-gray-900">Filtros de busca</h2>
					<p class="text-xs text-gray-500">
						{mode === 'maquinarios' ? 'Filtros avançados para maquinários' : 'Filtros avançados para produtos'}
					</p>
				</div>
				<button
					onclick={closeFilters}
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
					aria-label="Fechar filtros"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="space-y-5 overflow-y-auto pb-3">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</p>
					<div class="flex flex-wrap gap-2">
						{#each statusOptions as option}
							<button
								onclick={() => (draftFilters = { ...draftFilters, status: option.id })}
								class="rounded-full border px-3 py-2 text-xs font-medium transition-colors {draftFilters.status === option.id ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Ordenação</p>
					<div class="relative">
						<select
							bind:value={draftFilters.sort}
							class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						>
							{#each sortOptions as option}
								<option value={option.id}>{option.label}</option>
							{/each}
						</select>
						<ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Faixa de preço (R$)</p>
					<div class="grid grid-cols-2 gap-2">
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={draftFilters.minPrice}
							placeholder="Mínimo"
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={draftFilters.maxPrice}
							placeholder="Máximo"
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
					</div>
				</div>

				{#if mode === 'maquinarios'}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Marca</p>
						<div class="flex flex-wrap gap-2">
							{#each options.brands as brand}
								<button
									onclick={() => toggleArrayItem('brandIds', brand.id)}
									class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {draftFilters.brandIds.includes(brand.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
								>
									{#if draftFilters.brandIds.includes(brand.id)}
										<Check class="h-3 w-3" />
									{/if}
									{brand.label}
								</button>
							{:else}
								<p class="text-xs text-gray-400">Nenhuma marca disponível.</p>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo de maquinário</p>
						<div class="flex flex-wrap gap-2">
							{#each options.types as type}
								<button
									onclick={() => toggleArrayItem('typeIds', type.id)}
									class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {draftFilters.typeIds.includes(type.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
								>
									{#if draftFilters.typeIds.includes(type.id)}
										<Check class="h-3 w-3" />
									{/if}
									{type.label}
								</button>
							{:else}
								<p class="text-xs text-gray-400">Nenhum tipo disponível.</p>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Ano de fabricação</p>
						<div class="grid grid-cols-2 gap-2">
							<input
								type="number"
								min="1900"
								max="2100"
								inputmode="numeric"
								bind:value={draftFilters.minYear}
								placeholder="Ano mínimo"
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<input
								type="number"
								min="1900"
								max="2100"
								inputmode="numeric"
								bind:value={draftFilters.maxYear}
								placeholder="Ano máximo"
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Horímetro atual</p>
						<div class="grid grid-cols-2 gap-2">
							<input
								type="number"
								min="0"
								inputmode="numeric"
								bind:value={draftFilters.minHorimeter}
								placeholder="Mínimo"
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
							<input
								type="number"
								min="0"
								inputmode="numeric"
								bind:value={draftFilters.maxHorimeter}
								placeholder="Máximo"
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							/>
						</div>
					</div>
				{/if}

				{#if mode === 'produtos'}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</p>
						<div class="flex flex-wrap gap-2">
							{#each options.categories as category}
								<button
									onclick={() => toggleArrayItem('categories', category.id)}
									class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {draftFilters.categories.includes(category.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
								>
									{#if draftFilters.categories.includes(category.id)}
										<Check class="h-3 w-3" />
									{/if}
									{category.label}
								</button>
							{:else}
								<p class="text-xs text-gray-400">Nenhuma categoria disponível.</p>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="sticky bottom-0 mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white pb-6 pt-3">
				<button
					onclick={clearDraftFilters}
					class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					Limpar
				</button>
				<button
					onclick={applyFilters}
					class="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
				>
					Aplicar filtros
				</button>
			</div>
		</div>
	</div>
{/if}
