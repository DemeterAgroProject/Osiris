<script>
	import { page } from '$app/stores';
	import { AlertTriangle, Tractor } from 'lucide-svelte';

	const status = $derived($page.status);
	const errorMessage = $derived($page.error?.message);
	const isNotFound = $derived(status === 404);

	const headline = $derived(
		isNotFound ? 'Página não encontrada' : 'Ops, algo deu errado'
	);

	const description = $derived(
		isNotFound
			? 'Parece que você se perdeu no campo.'
			: 'Ops, tivemos um problema técnico na colheita dos dados.'
	);
</script>

<svelte:head>
	<title>{status} — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-6 py-12">
	<div class="w-full max-w-md text-center">
		<div
			class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full {isNotFound
				? 'bg-amber-50'
				: 'bg-red-50'}"
		>
			{#if isNotFound}
				<Tractor class="h-10 w-10 text-amber-600" strokeWidth={1.75} aria-hidden="true" />
			{:else}
				<AlertTriangle class="h-10 w-10 text-red-600" strokeWidth={1.75} aria-hidden="true" />
			{/if}
		</div>

		<p class="text-xs font-semibold uppercase tracking-wider text-green-700">Osiris</p>

		{#if status}
			<p class="mt-2 text-sm font-medium text-gray-400">Erro {status}</p>
		{/if}

		<h1 class="mt-3 text-2xl font-bold tracking-tight text-gray-900">{headline}</h1>
		<p class="mt-3 text-sm leading-relaxed text-gray-500">{description}</p>

		{#if errorMessage && !isNotFound}
			<p class="mt-4 rounded-xl bg-white px-4 py-3 text-left text-xs text-gray-500 ring-1 ring-gray-200">
				{errorMessage}
			</p>
		{/if}

		<a
			href="/"
			class="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800 sm:w-auto"
		>
			Voltar para o Início
		</a>
	</div>
</div>
