<script>
	import { MapPin, X } from 'lucide-svelte';
	import { formatMunicipio, searchMunicipios } from '$lib/municipios';
	import { m } from '$lib/paraglide/messages';

	// Campo "Cidade": busca no IBGE enquanto digita e guarda o município escolhido
	// ({ codigo_ibge, nome, uf }). Texto digitado sem escolher da lista não vale.

	let {
		value = $bindable(null),
		id = 'municipio',
		label = m.anunciar_municipio_cidade(),
		hint = '',
		required = false,
		placeholder = m.anunciar_municipio_placeholder()
	} = $props();

	let text = $state(formatMunicipio(value));
	let results = $state([]);
	let open = $state(false);
	let searching = $state(false);
	let active = $state(-1);
	let searchSeq = 0;
	let debounce;

	const listId = $derived(`${id}-opcoes`);
	const showEmpty = $derived(open && !searching && results.length === 0 && text.trim().length >= 2);

	// valor trocado por fora (ex.: pré-preenchido com a cidade do perfil)
	$effect(() => {
		const label = formatMunicipio(value);
		if (value && text !== label && !open) text = label;
	});

	function handleInput(event) {
		text = event.currentTarget.value;
		value = null;
		open = true;
		active = -1;
		clearTimeout(debounce);
		const term = text;
		if (term.trim().length < 2) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		debounce = setTimeout(async () => {
			const seq = ++searchSeq;
			const found = await searchMunicipios(term);
			if (seq !== searchSeq) return;
			results = found;
			searching = false;
		}, 250);
	}

	function choose(municipio) {
		value = municipio;
		text = formatMunicipio(municipio);
		open = false;
		results = [];
	}

	function clear() {
		value = null;
		text = '';
		results = [];
		open = false;
	}

	function handleKeydown(event) {
		if (!open || results.length === 0) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = (active + 1) % results.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = (active - 1 + results.length) % results.length;
		} else if (event.key === 'Enter' && active >= 0) {
			event.preventDefault();
			choose(results[active]);
		} else if (event.key === 'Escape') {
			open = false;
		}
	}

	function handleBlur() {
		// deixa o clique na opção acontecer antes de fechar
		setTimeout(() => {
			open = false;
			if (!value) text = text.trim() ? text : '';
		}, 150);
	}
</script>

<div class="relative">
	<label for={id} class="mb-1 block text-sm font-medium text-surface-700-300">
		{label}{#if required}<span class="text-error-600" aria-hidden="true"> *</span>{/if}
	</label>
	<div class="relative">
		<MapPin class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-700-300" />
		<input
			{id}
			type="text"
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={active >= 0 ? `${id}-opcao-${active}` : undefined}
			aria-invalid={required && !value && text.trim() !== '' ? 'true' : undefined}
			{placeholder}
			value={text}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => text.trim().length >= 2 && !value && (open = true)}
			onblur={handleBlur}
			class="input w-full rounded-container border border-surface-200-800 py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
		/>
		{#if text}
			<button
				type="button"
				class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-600-400 hover:preset-tonal"
				aria-label={m.anunciar_municipio_limpar()}
				onclick={clear}
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>

	{#if open && (results.length > 0 || searching || showEmpty)}
		<ul
			id={listId}
			role="listbox"
			class="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-container border border-surface-200-800 bg-surface-50-950 py-1 shadow-lg"
		>
			{#if searching && results.length === 0}
				<li class="px-4 py-2 text-sm text-surface-600-400">{m.anunciar_municipio_buscando()}</li>
			{:else if showEmpty}
				<li class="px-4 py-2 text-sm text-surface-600-400">{m.anunciar_municipio_nenhuma()}</li>
			{/if}
			{#each results as municipio, index (municipio.codigo_ibge)}
				<li
					id={`${id}-opcao-${index}`}
					role="option"
					aria-selected={index === active}
					class="cursor-pointer px-4 py-2 text-sm {index === active ? 'preset-tonal-primary' : 'hover:preset-tonal'}"
					onmousedown={(event) => {
						event.preventDefault();
						choose(municipio);
					}}
				>
					{municipio.nome} <span class="text-surface-600-400">– {municipio.uf}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if required && !value && text.trim() !== '' && !open}
		<p class="mt-1 text-xs text-error-600">{m.anunciar_municipio_escolha()}</p>
	{:else if hint}
		<p class="mt-1 text-xs text-surface-600-400">{hint}</p>
	{/if}
</div>
