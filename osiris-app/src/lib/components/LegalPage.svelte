<script>
	import { resolve } from '$app/paths';
	import { ChevronLeft } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { LEGAL } from '$lib/legal';
	import { m } from '$lib/paraglide/messages';

	let { title, description = '', children } = $props();

	function goBack(event) {
		if (history.length > 1) {
			event.preventDefault();
			history.back();
		}
	}
</script>

<svelte:head>
	<title>{title} — Osiris</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-surface-50-950 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-2xl px-4 py-4">
		<a
			href={resolve('/mais')}
			onclick={goBack}
			class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-900-100 hover:text-primary-700"
		>
			<ChevronLeft class="h-4 w-4" />
			{m.comum_voltar()}
		</a>

		<h1 class="preset-typo-headline">{title}</h1>
		<p class="mt-1 preset-typo-caption">{m.legal_atualizado_em({ data: LEGAL.atualizadoEm })}</p>

		<div class="legal mt-6 space-y-6 text-sm leading-relaxed text-surface-800-200">
			{@render children()}
		</div>
	</main>

	<BottomNav active="mais" />
</div>

<style>
	.legal :global(h2) {
		margin-bottom: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.legal :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	.legal :global(li + li) {
		margin-top: 0.25rem;
	}

	.legal :global(p + p),
	.legal :global(p + ul),
	.legal :global(ul + p) {
		margin-top: 0.5rem;
	}
</style>
