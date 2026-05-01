<script>
	import { SlidersHorizontal, DollarSign, MapPin, Calendar, ChevronDown, Check } from 'lucide-svelte';

	let activeType = $state('compra');
	let selectedCategories = $state(['Insumos', 'Maquinários']);
	let openDropdown = $state(null);
	
	// Filter selections
	let selectedPrice = $state(null);
	let selectedLocation = $state(null);
	let selectedDate = $state(null);
	let selectedFilterOptions = $state([]);

	const filters = [
		{ id: 'filtros', label: 'Filtros', icon: SlidersHorizontal },
		{ id: 'preco', label: 'Preço', icon: DollarSign },
		{ id: 'localidade', label: 'Localidade', icon: MapPin },
		{ id: 'data', label: 'Data', icon: Calendar }
	];

	const priceOptions = [
		{ id: 'ate-50k', label: 'Até R$ 50.000' },
		{ id: '50k-100k', label: 'R$ 50.000 - R$ 100.000' },
		{ id: '100k-250k', label: 'R$ 100.000 - R$ 250.000' },
		{ id: '250k-500k', label: 'R$ 250.000 - R$ 500.000' },
		{ id: 'acima-500k', label: 'Acima de R$ 500.000' }
	];

	const locationOptions = [
		{ id: 'alegrete', label: 'Alegrete, RS' },
		{ id: 'santa-maria', label: 'Santa Maria, RS' },
		{ id: 'porto-alegre', label: 'Porto Alegre, RS' },
		{ id: 'passo-fundo', label: 'Passo Fundo, RS' },
		{ id: 'pelotas', label: 'Pelotas, RS' },
		{ id: 'caxias', label: 'Caxias do Sul, RS' }
	];

	const dateOptions = [
		{ id: 'hoje', label: 'Hoje' },
		{ id: 'ultimos-7', label: 'Últimos 7 dias' },
		{ id: 'ultimos-15', label: 'Últimos 15 dias' },
		{ id: 'ultimos-30', label: 'Últimos 30 dias' },
		{ id: 'ultimos-90', label: 'Últimos 90 dias' }
	];

	const filterGeneralOptions = [
		{ id: 'novos', label: 'Apenas novos' },
		{ id: 'usados', label: 'Apenas usados' },
		{ id: 'com-fotos', label: 'Com fotos' },
		{ id: 'com-video', label: 'Com vídeo' },
		{ id: 'aceita-troca', label: 'Aceita troca' },
		{ id: 'frete-gratis', label: 'Frete grátis' }
	];

	const transactionTypes = [
		{ id: 'compra', label: 'Compra' },
		{ id: 'aluguel', label: 'Aluguel' },
		{ id: 'servico', label: 'Serviço' }
	];

	const categories = ['Insumos', 'Maquinários', 'Implementos', 'Sementes'];

	function toggleDropdown(id) {
		openDropdown = openDropdown === id ? null : id;
	}

	function closeDropdown() {
		openDropdown = null;
	}

	function toggleCategory(category) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter((c) => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
	}

	function toggleFilterOption(option) {
		if (selectedFilterOptions.includes(option)) {
			selectedFilterOptions = selectedFilterOptions.filter((o) => o !== option);
		} else {
			selectedFilterOptions = [...selectedFilterOptions, option];
		}
	}

	function selectPrice(id) {
		selectedPrice = selectedPrice === id ? null : id;
	}

	function selectLocation(id) {
		selectedLocation = selectedLocation === id ? null : id;
	}

	function selectDate(id) {
		selectedDate = selectedDate === id ? null : id;
	}

	function clearFilters() {
		selectedCategories = [];
		activeType = 'compra';
		selectedPrice = null;
		selectedLocation = null;
		selectedDate = null;
		selectedFilterOptions = [];
		openDropdown = null;
	}

	function getFilterLabel(id) {
		switch (id) {
			case 'preco':
				return selectedPrice ? priceOptions.find(p => p.id === selectedPrice)?.label || 'Preço' : 'Preço';
			case 'localidade':
				return selectedLocation ? locationOptions.find(l => l.id === selectedLocation)?.label || 'Localidade' : 'Localidade';
			case 'data':
				return selectedDate ? dateOptions.find(d => d.id === selectedDate)?.label || 'Data' : 'Data';
			case 'filtros':
				return selectedFilterOptions.length > 0 ? `Filtros (${selectedFilterOptions.length})` : 'Filtros';
			default:
				return '';
		}
	}

	function hasSelection(id) {
		switch (id) {
			case 'preco':
				return selectedPrice !== null;
			case 'localidade':
				return selectedLocation !== null;
			case 'data':
				return selectedDate !== null;
			case 'filtros':
				return selectedFilterOptions.length > 0;
			default:
				return false;
		}
	}

	function getDropdownOptions(id) {
		switch (id) {
			case 'preco':
				return priceOptions;
			case 'localidade':
				return locationOptions;
			case 'data':
				return dateOptions;
			case 'filtros':
				return filterGeneralOptions;
			default:
				return [];
		}
	}

	function isOptionSelected(filterId, optionId) {
		switch (filterId) {
			case 'preco':
				return selectedPrice === optionId;
			case 'localidade':
				return selectedLocation === optionId;
			case 'data':
				return selectedDate === optionId;
			case 'filtros':
				return selectedFilterOptions.includes(optionId);
			default:
				return false;
		}
	}

	function handleOptionClick(filterId, optionId) {
		switch (filterId) {
			case 'preco':
				selectPrice(optionId);
				break;
			case 'localidade':
				selectLocation(optionId);
				break;
			case 'data':
				selectDate(optionId);
				break;
			case 'filtros':
				toggleFilterOption(optionId);
				break;
		}
	}
</script>

<svelte:window onclick={closeDropdown} />

<div class="space-y-3 bg-white px-4 py-3">
	<!-- Filter chips with dropdowns -->
	<div class="flex gap-2 overflow-x-auto hide-scrollbar">
		{#each filters as filter}
			<div class="relative shrink-0">
				<button
					onclick={(e) => { e.stopPropagation(); toggleDropdown(filter.id); }}
					class="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors {hasSelection(filter.id) 
						? 'border-green-500 bg-green-50 text-green-700' 
						: 'border-gray-200 bg-white text-gray-700 hover:border-green-500 hover:text-green-600'}"
				>
					<svelte:component this={filter.icon} class="h-4 w-4" />
					<span class="max-w-32 truncate">{getFilterLabel(filter.id)}</span>
					<ChevronDown class="h-3 w-3 transition-transform {openDropdown === filter.id ? 'rotate-180' : ''}" />
				</button>

				{#if openDropdown === filter.id}
					<div 
						onclick={(e) => e.stopPropagation()}
						class="fixed left-4 right-4 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl sm:absolute sm:left-0 sm:right-auto sm:min-w-56"
					>
						{#each getDropdownOptions(filter.id) as option}
							<button
								onclick={() => handleOptionClick(filter.id, option.id)}
								class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 {isOptionSelected(filter.id, option.id) ? 'text-green-600 font-medium' : 'text-gray-700'}"
							>
								<span>{option.label}</span>
								{#if isOptionSelected(filter.id, option.id)}
									<Check class="h-4 w-4 text-green-600" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Transaction type toggle -->
	<div class="flex rounded-lg border border-gray-200 p-1">
		{#each transactionTypes as type}
			<button
				onclick={() => (activeType = type.id)}
				class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors {activeType === type.id
					? 'bg-green-600 text-white'
					: 'text-gray-600 hover:bg-gray-50'}"
			>
				{type.label}
			</button>
		{/each}
	</div>

	<!-- Category tags -->
	<div class="flex flex-wrap gap-2">
		{#each categories as category}
			<button
				onclick={() => toggleCategory(category)}
				class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {selectedCategories.includes(category)
					? 'border-green-600 bg-green-50 text-green-700'
					: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}"
			>
				{category}
			</button>
		{/each}
	</div>

	<!-- Action buttons -->
	<div class="flex items-center justify-between pt-1">
		<button onclick={clearFilters} class="text-sm font-medium text-gray-600 hover:text-gray-800">
			Limpar
		</button>
		<button
			class="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
		>
			Aplicar Filtros
		</button>
	</div>
</div>
