<script>
	import { SlidersHorizontal, X, Check, ChevronDown } from 'lucide-svelte';

	function createDefaultFilters() {
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
		return {
			...createDefaultFilters(),
			...source,
			listingTypes: [...(source?.listingTypes ?? [])],
			productKinds: [...(source?.productKinds ?? [])],
			serviceKinds: [...(source?.serviceKinds ?? [])],
			laborKinds: [...(source?.laborKinds ?? [])]
		};
	}

	let {
		filters = $bindable(createDefaultFilters()),
		locations = [],
		onApply = null
	} = $props();

	const listingTypeOptions = [
		{ id: 'produto', label: 'Produto' },
		{ id: 'servico', label: 'Serviço (pacote completo)' },
		{ id: 'mao-de-obra', label: 'Mão de obra (pessoa)' }
	];

	const productKindOptions = [
		{ id: 'insumos', label: 'Insumos' },
		{ id: 'maquinas', label: 'Máquinas' }
	];

	const serviceKindOptions = [
		{ id: 'contratar-servico', label: 'Contratar serviço' }
	];

	const laborKindOptions = [
		{ id: 'operador-maquinas', label: 'Operador de máquinas' },
		{ id: 'tecnico-campo', label: 'Técnico de campo' },
		{ id: 'auxiliar-rural', label: 'Auxiliar rural' }
	];

	const statusOptions = [
		{ id: '', label: 'Todos' },
		{ id: 'Ativo', label: 'Ativo' },
		{ id: 'Pausado', label: 'Pausado' },
		{ id: 'Inativo', label: 'Inativo' }
	];

	const sortOptions = [
		{ id: 'recentes', label: 'Mais recentes' },
		{ id: 'preco-asc', label: 'Menor preço' },
		{ id: 'preco-desc', label: 'Maior preço' },
		{ id: 'nome-asc', label: 'Nome (A-Z)' },
		{ id: 'nome-desc', label: 'Nome (Z-A)' }
	];

	let isOpen = $state(false);
	let draft = $state(createDefaultFilters());

	function openFilters() {
		draft = cloneFilters(filters);
		isOpen = true;
	}

	function closeFilters() {
		isOpen = false;
	}

	function clearDraft() {
		draft = createDefaultFilters();
	}

	function toggleArrayItem(key, id) {
		const values = draft[key];
		if (values.includes(id)) {
			draft = { ...draft, [key]: values.filter((value) => value !== id) };
		} else {
			draft = { ...draft, [key]: [...values, id] };
		}
	}

	function applyFilters() {
		filters = cloneFilters(draft);
		isOpen = false;
		if (typeof onApply === 'function') onApply(filters);
	}

	function isSelected(key, id) {
		return draft[key].includes(id);
	}

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

	const count = $derived(activeFilterCount(filters));
	const locationOptions = $derived(
		(locations.length ? locations : ['Alegrete, RS', 'Santa Maria, RS', 'Uruguaiana, RS']).map((item) => ({
			id: item,
			label: item
		}))
	);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && isOpen) closeFilters();
	}}
/>

<div class="px-4 py-3">
	<button
		onclick={openFilters}
		class="relative flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-green-500 hover:text-green-600"
	>
		<SlidersHorizontal class="h-4 w-4" />
		Filtros
		{#if count > 0}
			<span class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
				{count}
			</span>
		{/if}
	</button>
</div>

{#if isOpen}
	<div class="fixed inset-0 z-40 bg-black/30" onclick={closeFilters}></div>
	<div class="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl">
		<div class="mx-auto w-full max-w-3xl px-4 pb-6 pt-4">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-base font-semibold text-gray-900">Filtros gerais</h2>
					<p class="text-xs text-gray-500">Produtos, serviços e mão de obra</p>
				</div>
				<button
					onclick={closeFilters}
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
					aria-label="Fechar filtros"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="max-h-[70vh] space-y-5 overflow-y-auto pb-3">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo de anúncio</p>
					<div class="flex flex-wrap gap-2">
						{#each listingTypeOptions as option}
							<button
								onclick={() => toggleArrayItem('listingTypes', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected('listingTypes', option.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{#if isSelected('listingTypes', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Produtos</p>
					<div class="flex flex-wrap gap-2">
						{#each productKindOptions as option}
							<button
								onclick={() => toggleArrayItem('productKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected('productKinds', option.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{#if isSelected('productKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Serviços</p>
					<div class="flex flex-wrap gap-2">
						{#each serviceKindOptions as option}
							<button
								onclick={() => toggleArrayItem('serviceKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected('serviceKinds', option.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{#if isSelected('serviceKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Mão de obra</p>
					<div class="flex flex-wrap gap-2">
						{#each laborKindOptions as option}
							<button
								onclick={() => toggleArrayItem('laborKinds', option.id)}
								class="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors {isSelected('laborKinds', option.id) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{#if isSelected('laborKinds', option.id)}<Check class="h-3 w-3" />{/if}
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</p>
					<div class="flex flex-wrap gap-2">
						{#each statusOptions as option}
							<button
								onclick={() => (draft = { ...draft, status: option.id })}
								class="rounded-full border px-3 py-2 text-xs font-medium transition-colors {draft.status === option.id ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Localidade</p>
					<div class="relative">
						<select
							bind:value={draft.location}
							class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						>
							<option value="">Todas</option>
							{#each locationOptions as option}
								<option value={option.id}>{option.label}</option>
							{/each}
						</select>
						<ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Ordenação</p>
					<div class="relative">
						<select
							bind:value={draft.sort}
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
							bind:value={draft.minPrice}
							placeholder="Mínimo"
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={draft.maxPrice}
							placeholder="Máximo"
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
					</div>
				</div>
			</div>

			<div class="mt-5 grid grid-cols-2 gap-2">
				<button
					onclick={clearDraft}
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
