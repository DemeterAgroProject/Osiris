<script>
	import { SlidersHorizontal, X, Check, ChevronDown } from 'lucide-svelte';

	function createDefaultMarketplaceFilters() {
		return {
			listingTypes: [],
			productKinds: [],
			serviceKinds: [],
			laborKinds: [],
			status: '',
			location: '',
			sort: 'recentes',
			minPrice: '',
			maxPrice: ''
		};
	}

	function cloneFilters(source) {
		const defaults = createDefaultMarketplaceFilters();
		return {
			...defaults,
			...source,
			listingTypes: [...(source?.listingTypes ?? defaults.listingTypes)],
			productKinds: [...(source?.productKinds ?? defaults.productKinds)],
			serviceKinds: [...(source?.serviceKinds ?? defaults.serviceKinds)],
			laborKinds: [...(source?.laborKinds ?? defaults.laborKinds)]
		};
	}

	let {
		filters = $bindable(createDefaultMarketplaceFilters()),
		locations = [],
		resultCount = null
	} = $props();

	const listingTypeOptions = [
		{ id: 'produto', label: 'Produto' },
		{ id: 'maquinario', label: 'Maquinário' },
		{ id: 'servico', label: 'Serviço (pacote)' },
		{ id: 'mao-de-obra', label: 'Mão de obra' }
	];

	const productKindOptions = [
		{ id: 'insumos', label: 'Insumos' },
		{ id: 'maquinas', label: 'Máquinas' }
	];

	const serviceKindOptions = [{ id: 'pacote', label: 'Pacote completo' }];

	const laborKindOptions = [{ id: 'mao-de-obra', label: 'Mão de obra' }];

	const statusOptions = [
		{ id: '', label: 'Todos' },
		{ id: 'ativo', label: 'Ativo' },
		{ id: 'pausado', label: 'Pausado' }
	];

	const sortOptions = [
		{ id: 'recentes', label: 'Mais recentes' },
		{ id: 'preco-asc', label: 'Menor preço' },
		{ id: 'preco-desc', label: 'Maior preço' },
		{ id: 'nome-asc', label: 'Nome (A-Z)' },
		{ id: 'nome-desc', label: 'Nome (Z-A)' }
	];

	let isOpen = $state(false);
	let draft = $state(createDefaultMarketplaceFilters());

	const locationOptions = $derived(
		(locations.length ? locations : ['Alegrete, RS', 'Santa Maria, RS', 'Uruguaiana, RS']).map(
			(item) => ({ id: item, label: item })
		)
	);

	function activeFilterCount(value) {
		let count = 0;
		if (value.listingTypes.length) count++;
		if (value.productKinds.length) count++;
		if (value.serviceKinds.length) count++;
		if (value.laborKinds.length) count++;
		if (value.status) count++;
		if (value.location) count++;
		if (value.minPrice || value.maxPrice) count++;
		return count;
	}

	const activeCount = $derived(activeFilterCount(filters));

	const activeLabels = $derived.by(() => {
		const labels = [];
		for (const id of filters.listingTypes) {
			const opt = listingTypeOptions.find((o) => o.id === id);
			if (opt) labels.push(opt.label);
		}
		if (filters.location) labels.push(filters.location);
		if (filters.minPrice || filters.maxPrice) {
			labels.push(
				`R$ ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`
			);
		}
		if (filters.sort !== 'recentes') {
			const sort = sortOptions.find((o) => o.id === filters.sort);
			if (sort) labels.push(sort.label);
		}
		return labels;
	});

	function openFilters() {
		draft = cloneFilters(filters);
		isOpen = true;
	}

	function closeFilters() {
		isOpen = false;
	}

	function clearDraft() {
		draft = createDefaultMarketplaceFilters();
	}

	function applyFilters() {
		filters = cloneFilters(draft);
		isOpen = false;
	}

	function toggleArrayItem(key, id) {
		const values = draft[key];
		if (values.includes(id)) {
			draft = { ...draft, [key]: values.filter((value) => value !== id) };
		} else {
			draft = { ...draft, [key]: [...values, id] };
		}
	}

	function isSelected(key, id) {
		return draft[key].includes(id);
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && isOpen) closeFilters();
	}}
/>

<div class="space-y-2 px-4 pb-3 mt-4">
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={openFilters}
			class="relative flex flex-1 items-center justify-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm font-medium text-surface-700-300 shadow-sm transition-colors hover:border-primary-500 hover:text-primary-600"
		>
			<SlidersHorizontal class="h-4 w-4 shrink-0" />
			<span>Filtros</span>
			{#if activeCount > 0}
				<span
					class="rounded-full preset-filled-primary-500 px-2 py-0.5 text-[10px] font-semibold"
				>
					{activeCount}
				</span>
			{/if}
		</button>

		{#if resultCount !== null}
			<p class="shrink-0 text-xs font-medium text-surface-600-400">
				{resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
			</p>
		{/if}
	</div>

	{#if activeLabels.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each activeLabels as label (label)}
				<span
					class="rounded-full border border-primary-500 preset-tonal-primary px-2.5 py-1 text-[10px] font-semibold text-primary-700"
				>
					{label}
				</span>
			{/each}
		</div>
	{/if}
</div>

{#if isOpen}
	<button
		type="button"
		class="fixed inset-0 z-[70] border-0 bg-surface-950/30 p-0"
		onclick={closeFilters}
		aria-label="Fechar filtros"
	></button>
	<div
		class="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl bg-surface-50-950 shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="filter-bar-title"
	>
		<div class="mx-auto w-full max-w-3xl px-4 pb-6 pt-4">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 id="filter-bar-title" class="text-base font-semibold text-surface-950-50">
						Filtros do marketplace
					</h2>
					<p class="text-xs text-surface-600-400">Produtos, maquinários e serviços</p>
				</div>
				<button
					type="button"
					onclick={closeFilters}
					class="rounded-full p-2 text-surface-600-400 transition-colors hover:preset-tonal hover:text-surface-600-400"
					aria-label="Fechar filtros"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="max-h-[70vh] space-y-5 overflow-y-auto pb-3">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">
						Tipo de anúncio
					</p>
					<div class="flex flex-wrap gap-2">
						{#each listingTypeOptions as option (option.id)}
							<button
								type="button"
								onclick={() => toggleArrayItem('listingTypes', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected(
									'listingTypes',
									option.id
								)
									? 'border-primary-500 preset-tonal-primary text-primary-700'
									: 'border-surface-200-800 text-surface-600-400'}"
							>
								{#if isSelected('listingTypes', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">Produtos</p>
					<div class="flex flex-wrap gap-2">
						{#each productKindOptions as option (option.id)}
							<button
								type="button"
								onclick={() => toggleArrayItem('productKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected(
									'productKinds',
									option.id
								)
									? 'border-primary-500 preset-tonal-primary text-primary-700'
									: 'border-surface-200-800 text-surface-600-400'}"
							>
								{#if isSelected('productKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">Serviços</p>
					<div class="flex flex-wrap gap-2">
						{#each serviceKindOptions as option (option.id)}
							<button
								type="button"
								onclick={() => toggleArrayItem('serviceKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected(
									'serviceKinds',
									option.id
								)
									? 'border-primary-500 preset-tonal-primary text-primary-700'
									: 'border-surface-200-800 text-surface-600-400'}"
							>
								{#if isSelected('serviceKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">Mão de obra</p>
					<div class="flex flex-wrap gap-2">
						{#each laborKindOptions as option (option.id)}
							<button
								type="button"
								onclick={() => toggleArrayItem('laborKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected(
									'laborKinds',
									option.id
								)
									? 'border-primary-500 preset-tonal-primary text-primary-700'
									: 'border-surface-200-800 text-surface-600-400'}"
							>
								{#if isSelected('laborKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">Localidade</p>
					<div class="relative">
						<select
							bind:value={draft.location}
							class="w-full appearance-none rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm text-surface-700-300 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						>
							<option value="">Todas as regiões</option>
							{#each locationOptions as option (option.id)}
								<option value={option.id}>{option.label}</option>
							{/each}
						</select>
						<ChevronDown
							class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-600-400"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">Ordenação</p>
					<div class="relative">
						<select
							bind:value={draft.sort}
							class="w-full appearance-none rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm text-surface-700-300 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						>
							{#each sortOptions as option (option.id)}
								<option value={option.id}>{option.label}</option>
							{/each}
						</select>
						<ChevronDown
							class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-600-400"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-surface-600-400">
						Faixa de preço (R$)
					</p>
					<div class="grid grid-cols-2 gap-2">
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={draft.minPrice}
							placeholder="Mínimo"
							class="w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						/>
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={draft.maxPrice}
							placeholder="Máximo"
							class="w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						/>
					</div>
				</div>
			</div>

			<div class="mt-5 grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={clearDraft}
					class="rounded-container border border-surface-200-800 px-4 py-3 text-sm font-medium text-surface-700-300 transition-colors hover:preset-tonal"
				>
					Limpar
				</button>
				<button
					type="button"
					onclick={applyFilters}
					class="rounded-container preset-filled-primary-500 px-4 py-3 text-sm font-semibold transition-colors"
				>
					Aplicar filtros
				</button>
			</div>
		</div>
	</div>
{/if}
