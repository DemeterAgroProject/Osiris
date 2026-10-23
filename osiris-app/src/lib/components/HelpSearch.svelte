<script>
	import { resolve } from '$app/paths';
	import { Search, X, ChevronRight } from 'lucide-svelte';
	import { searchHelp } from '$lib/help';
	import { m } from '$lib/paraglide/messages';

	// resultsClass: posição e largura da lista de resultados abaixo do campo
	let { inputId = 'help-search', resultsClass = 'inset-x-0' } = $props();

	let query = $state('');
	let open = $state(false);

	const results = $derived(searchHelp(query).slice(0, 6));
	const showResults = $derived(open && query.trim().length > 1);

	// fecha a lista quando o foco sai do campo e dos resultados
	function handleFocusOut(event) {
		if (!event.currentTarget.contains(event.relatedTarget)) open = false;
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') open = false;
	}

	function clearSearch() {
		query = '';
		document.getElementById(inputId)?.focus();
	}

	function pickResult() {
		open = false;
		query = '';
	}
</script>

<div class="relative" onfocusout={handleFocusOut}>
	<Search class="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-surface-800-200" aria-hidden="true" />
	<input
		id={inputId}
		type="text"
		inputmode="search"
		enterkeyhint="search"
		bind:value={query}
		onfocus={() => (open = true)}
		oninput={() => (open = true)}
		onkeydown={handleKeydown}
		placeholder={m.ajuda_buscar_placeholder()}
		aria-label={m.ajuda_buscar_rotulo()}
		aria-controls="{inputId}-results"
		autocomplete="off"
		class="input h-11 w-full rounded-container border-surface-200-800 bg-surface-50-950 pl-10 pr-11 text-sm placeholder:text-surface-800-200 transition-all hover:border-surface-300-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
	/>
	{#if query}
		<button
			type="button"
			onclick={clearSearch}
			class="btn-icon btn-icon-sm absolute right-1.5 top-1/2 -translate-y-1/2 hover:preset-tonal"
			aria-label={m.ajuda_limpar_busca()}
			title={m.ajuda_limpar_busca()}
		>
			<X size={16} />
		</button>
	{/if}

	{#if showResults}
		<div
			id="{inputId}-results"
			class="absolute {resultsClass} top-full z-30 mt-2 max-h-[min(24rem,60vh)] overflow-y-auto rounded-container border border-surface-200-800 bg-surface-50-950 shadow-xl"
		>
			<p class="sr-only" aria-live="polite">{results.length === 1 ? m.ajuda_resultado_um() : m.ajuda_resultados({ count: results.length })}</p>
			{#if results.length}
				<ul class="divide-y divide-surface-200-800">
					{#each results as result (result.article.slug)}
						<li>
							<a
								href={resolve(`/ajuda/${result.article.slug}`)}
								onclick={pickResult}
								class="flex items-center gap-3 px-4 py-3 transition-colors hover:preset-tonal focus-visible:preset-tonal"
							>
								<span class="min-w-0 flex-1">
									<span class="block font-semibold text-surface-950-50">{result.article.title}</span>
									<span class="mt-0.5 line-clamp-2 block text-sm text-surface-800-200">{result.excerpt}</span>
								</span>
								<ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300" />
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-4 py-4 text-sm text-surface-800-200">
					{m.ajuda_nada_encontrado({ termo: query.trim() })}
				</p>
			{/if}
		</div>
	{/if}
</div>
