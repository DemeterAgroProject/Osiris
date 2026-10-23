<script>
	import { untrack } from 'svelte';
	import { SlidersHorizontal, Check, ChevronDown, Eraser } from 'lucide-svelte';
	import { ToggleGroup } from '@skeletonlabs/skeleton-svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import AppAccordion from '$lib/components/ui/AppAccordion.svelte';
	import { m } from '$lib/paraglide/messages';

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

	/**
	 * variant 'bar': botão "Filtros" + atalhos de tipo (celular); os campos abrem numa gaveta.
	 * 'sidebar': os mesmos campos fixos numa coluna lateral (computador).
	 * 'chips': só os atalhos de tipo (acima dos resultados, no computador).
	 */
	let {
		filters = $bindable(createDefaultMarketplaceFilters()),
		locations = [],
		resultCount = null,
		variant = 'bar'
	} = $props();

	// os ids são os valores dos filtros (não mudam); label guarda a função da mensagem, chamada no template
	const listingTypeOptions = [
		{ id: 'produto', label: m.busca_filtro_produto },
		{ id: 'maquinario', label: m.busca_filtro_maquinario },
		{ id: 'servico', label: m.busca_filtro_servico_pacote },
		{ id: 'mao-de-obra', label: m.busca_mao_de_obra }
	];

	const productKindOptions = [
		{ id: 'insumos', label: m.busca_filtro_insumos },
		{ id: 'maquinas', label: m.busca_cat_maquinas }
	];

	const serviceKindOptions = [{ id: 'pacote', label: m.busca_pacote_completo }];

	const laborKindOptions = [{ id: 'mao-de-obra', label: m.busca_mao_de_obra }];

	const sortOptions = [
		{ id: 'recentes', label: m.busca_ordem_recentes },
		{ id: 'preco-asc', label: m.busca_ordem_preco_asc },
		{ id: 'preco-desc', label: m.busca_ordem_preco_desc },
		{ id: 'nome-asc', label: m.busca_ordem_nome_asc },
		{ id: 'nome-desc', label: m.busca_ordem_nome_desc }
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
			if (opt) labels.push(opt.label());
		}
		if (filters.location) labels.push(filters.location);
		if (filters.minPrice || filters.maxPrice) {
			labels.push(
				`R$ ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`
			);
		}
		if (filters.sort !== 'recentes') {
			const sort = sortOptions.find((o) => o.id === filters.sort);
			if (sort) labels.push(sort.label());
		}
		return labels;
	});

	function openFilters() {
		draft = cloneFilters(filters);
		isOpen = true;
	}

	function clearDraft() {
		draft = createDefaultMarketplaceFilters();
	}

	function applyFilters() {
		filters = cloneFilters(draft);
		isOpen = false;
	}

	// na lateral o rascunho acompanha o filtro aplicado (ex.: um atalho de tipo tocado acima dos resultados)
	$effect(() => {
		if (variant === 'sidebar') draft = cloneFilters(filters);
	});

	function clearAndApply() {
		draft = createDefaultMarketplaceFilters();
		applyFilters();
	}

	const quickTypeOptions = [{ id: '', label: m.busca_todos }, ...listingTypeOptions];

	function isQuickTypeSelected(id) {
		if (!id) return filters.listingTypes.length === 0;
		return filters.listingTypes.length === 1 && filters.listingTypes[0] === id;
	}

	function selectQuickType(id) {
		filters = { ...cloneFilters(filters), listingTypes: id ? [id] : [] };
	}

	// quantos filtros estão marcados em cada grupo (selo no título do accordion)
	function groupCount(group) {
		switch (group) {
			case 'tipo':
				return draft.listingTypes.length;
			case 'produtos':
				return draft.productKinds.length;
			case 'servicos':
				return draft.serviceKinds.length;
			case 'maoDeObra':
				return draft.laborKinds.length;
			case 'localidade':
				return draft.location ? 1 : 0;
			case 'ordenacao':
				return draft.sort !== 'recentes' ? 1 : 0;
			case 'preco':
				return draft.minPrice || draft.maxPrice ? 1 : 0;
			default:
				return 0;
		}
	}

	function updateDraftArray(key, values) {
		draft = { ...draft, [key]: values };
	}

	function isSelected(key, id) {
		return draft[key].includes(id);
	}
</script>

{#snippet typeChips()}
<!-- atalho para o filtro "Tipo de anúncio": um toque troca o tipo mostrado -->
<div class="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={m.busca_tipo_anuncio()}>
	{#each quickTypeOptions as option (option.id)}
		{@const selected = isQuickTypeSelected(option.id)}
		<button
			type="button"
			onclick={() => selectQuickType(option.id)}
			aria-pressed={selected}
			class="btn shrink-0 rounded-full {selected
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-200-800 bg-surface-50-950'}"
		>
			{#if selected}
				<Check size={18} />
			{/if}
			<span>{option.label()}</span>
		</button>
	{/each}
</div>
{/snippet}

{#if variant === 'bar'}
<div class="mx-auto w-full max-w-7xl space-y-3 px-4 pb-3 pt-1 sm:px-6 lg:px-8">
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={openFilters}
			class="btn preset-outlined-surface-200-800 bg-surface-50-950"
		>
			<SlidersHorizontal size={18} />
			<span>{m.busca_filtros()}</span>
			{#if activeCount > 0}
				<span class="flex h-5 min-w-5 items-center justify-center rounded-full preset-filled-primary-500 px-1 text-xs font-bold">
					{activeCount}
				</span>
			{/if}
		</button>

		{#if resultCount !== null}
			<p class="ml-auto shrink-0 text-sm font-medium text-surface-900-100">
				<strong class="text-surface-950-50">{resultCount}</strong> {resultCount === 1 ? m.busca_resultado() : m.busca_resultados_palavra()}
			</p>
		{/if}
	</div>

	{@render typeChips()}

	{#if activeLabels.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each activeLabels as label (label)}
				<span class="badge rounded-full preset-tonal-primary px-2.5 py-1 text-xs font-semibold">
					{label}
				</span>
			{/each}
		</div>
	{/if}
</div>
{:else if variant === 'chips'}
	{@render typeChips()}
{/if}

{#snippet toggleOptions(key, options)}
	<!-- caixinhas do tamanho do texto, sem quebrar; o que não couber desce para a linha de baixo -->
	<ToggleGroup
		multiple
		value={draft[key]}
		onValueChange={(details) => updateDraftArray(key, details.value)}
		class="flex! w-full! flex-row! flex-wrap! items-start! gap-2 overflow-visible! rounded-none! border-0! bg-transparent! p-0!"
	>
		{#each options as option (option.id)}
			<ToggleGroup.Item
				value={option.id}
				class="flex! h-auto! min-h-10 w-auto! aspect-auto! items-center justify-center gap-1.5 rounded-container border border-surface-200-800 px-3 py-2 text-sm font-medium whitespace-nowrap text-surface-900-100 transition-colors data-[state=on]:border-primary-500 data-[state=on]:preset-tonal-primary data-[state=on]:text-primary-700"
			>
				{#if isSelected(key, option.id)}
					<Check class="h-3.5 w-3.5 shrink-0" />
				{/if}
				<span>{option.label()}</span>
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup>
{/snippet}

{#snippet filterFields()}
<div>
	<AppAccordion variant="section" title={m.busca_tipo_anuncio()} open={true} badge={groupCount('tipo') || ''}>
		{@render toggleOptions('listingTypes', listingTypeOptions)}
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_produtos()} open={untrack(() => groupCount('produtos') > 0)} badge={groupCount('produtos') || ''}>
		{@render toggleOptions('productKinds', productKindOptions)}
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_cat_servicos()} open={untrack(() => groupCount('servicos') > 0)} badge={groupCount('servicos') || ''}>
		{@render toggleOptions('serviceKinds', serviceKindOptions)}
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_mao_de_obra()} open={untrack(() => groupCount('maoDeObra') > 0)} badge={groupCount('maoDeObra') || ''}>
		{@render toggleOptions('laborKinds', laborKindOptions)}
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_localidade()} open={untrack(() => groupCount('localidade') > 0)} badge={groupCount('localidade') || ''}>
		<div class="relative">
			<select
				bind:value={draft.location}
				aria-label={m.busca_localidade()}
				class="select h-11 w-full appearance-none rounded-container border border-surface-200-800 bg-surface-50-950 pl-3 pr-9 text-sm text-surface-900-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			>
				<option value="">{m.busca_todas_regioes()}</option>
				{#each locationOptions as option (option.id)}
					<option value={option.id}>{option.label}</option>
				{/each}
			</select>
			<ChevronDown
				class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-900-100"
			/>
		</div>
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_ordenacao()} open={untrack(() => groupCount('ordenacao') > 0)} badge={groupCount('ordenacao') || ''}>
		<div class="relative">
			<select
				bind:value={draft.sort}
				aria-label={m.busca_ordenacao()}
				class="select h-11 w-full appearance-none rounded-container border border-surface-200-800 bg-surface-50-950 pl-3 pr-9 text-sm text-surface-900-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			>
				{#each sortOptions as option (option.id)}
					<option value={option.id}>{option.label()}</option>
				{/each}
			</select>
			<ChevronDown
				class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-900-100"
			/>
		</div>
	</AppAccordion>

	<AppAccordion variant="section" title={m.busca_faixa_preco()} open={untrack(() => groupCount('preco') > 0)} badge={groupCount('preco') || ''}>
		<div class="grid grid-cols-2 gap-2">
			<input
				type="number"
				min="0"
				inputmode="numeric"
				bind:value={draft.minPrice}
				placeholder={m.busca_minimo()}
				aria-label={m.busca_preco_minimo()}
				class="input h-11 w-full min-w-0 rounded-container border border-surface-200-800 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			/>
			<input
				type="number"
				min="0"
				inputmode="numeric"
				bind:value={draft.maxPrice}
				placeholder={m.busca_maximo()}
				aria-label={m.busca_preco_maximo()}
				class="input h-11 w-full min-w-0 rounded-container border border-surface-200-800 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			/>
		</div>
	</AppAccordion>
</div>
{/snippet}

<AppDialog
	bind:open={isOpen}
	title={m.busca_filtros_titulo()}
	description={m.busca_filtros_descricao()}
	variant="sheet"
	size="lg"
	closeLabel={m.busca_fechar_filtros()}
>
	{@render filterFields()}

	{#snippet footer()}
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={clearDraft}
				class="btn btn-lg preset-tonal w-full"
			>
				<Eraser size={18} />
				<span>{m.busca_limpar()}</span>
			</button>
			<button
				type="button"
				onclick={applyFilters}
				class="btn btn-lg preset-filled-primary-500 w-full"
			>
				<Check size={18} />
				<span>{m.busca_aplicar()}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>

{#if variant === 'sidebar'}
	<section class="rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm" aria-labelledby="filtros-laterais">
		<div class="mb-2 flex items-center justify-between gap-2">
			<h2 id="filtros-laterais" class="flex items-center gap-2 preset-typo-title">
				<SlidersHorizontal size={20} />
				{m.busca_filtros()}
			</h2>
			{#if activeCount > 0}
				<button type="button" onclick={clearAndApply} class="btn btn-sm preset-tonal">
					<Eraser size={16} />
					<span>{m.busca_limpar()}</span>
				</button>
			{/if}
		</div>

		{@render filterFields()}

		<button type="button" onclick={applyFilters} class="btn btn-md preset-filled-primary-500 mt-6 w-full">
			<Check size={18} />
			<span>{m.busca_aplicar_filtros()}</span>
		</button>
	</section>
{/if}
