<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { BookOpen, Menu, X } from 'lucide-svelte';
	import HelpNav from '$lib/components/HelpNav.svelte';
	import HelpSearch from '$lib/components/HelpSearch.svelte';

	// topo próprio da central de ajuda (no lugar do Header do app): busca, volta ao app e,
	// no celular, o menu com os temas em uma gaveta
	let { current = '' } = $props();

	let menuOpen = $state(false);
	let headerHeight = $state(0);

	// trocou de artigo: fecha a gaveta
	$effect(() => {
		void page.url.pathname;
		menuOpen = false;
	});

	function handleKeydown(event) {
		if (event.key === 'Escape') menuOpen = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header
	bind:clientHeight={headerHeight}
	class="sticky top-0 z-50 border-b border-surface-200-800 bg-surface-50-950/95 px-4 py-3 backdrop-blur lg:px-8"
>
	<div class="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => (menuOpen = !menuOpen)}
				class="btn-icon btn-icon-lg -ml-1 lg:hidden {menuOpen ? 'border border-surface-300-700 rounded-full' : 'hover:preset-tonal'}"
				aria-expanded={menuOpen}
				aria-controls="ajuda-menu"
				aria-label={menuOpen ? 'Fechar temas da ajuda' : 'Abrir temas da ajuda'}
			>
				{#if menuOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
			<a href={resolve('/ajuda')} class="flex items-center gap-2 font-bold text-surface-950-50">
				<BookOpen class="h-6 w-6 text-primary-600-400" />
				<span>Central de ajuda</span>
			</a>
		</div>

		<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
			<div class="lg:w-80">
				<HelpSearch inputId="ajuda-busca" resultsClass="inset-x-0 lg:left-auto lg:right-0 lg:w-[26rem]" />
			</div>
			<a href={resolve('/')} class="btn preset-filled-primary-500 h-11 w-full lg:w-auto">Voltar ao app</a>
		</div>
	</div>
</header>

{#if menuOpen}
	<button
		type="button"
		class="fixed inset-x-0 bottom-0 z-40 bg-surface-950/50 lg:hidden"
		style="top: {headerHeight}px"
		onclick={() => (menuOpen = false)}
		aria-label="Fechar temas da ajuda"
		tabindex="-1"
	></button>
	<div
		id="ajuda-menu"
		class="fixed bottom-0 left-0 z-40 w-[17rem] overflow-y-auto border-r border-surface-200-800 bg-surface-50-950 px-3 py-4 shadow-xl lg:hidden"
		style="top: {headerHeight}px"
	>
		<HelpNav {current} onnavigate={() => (menuOpen = false)} />
	</div>
{/if}
