<script>
	import { Search, X } from 'lucide-svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

	let {
		value = $bindable(''),
		placeholder = 'Buscar máquinas, produtos e serviços...',
		loading = false,
		inputId = 'marketplace-search'
	} = $props();

	function clearSearch() {
		value = '';
	}
</script>

<div class="px-4 py-3">
	<div class="relative mx-auto max-w-3xl">
		{#if loading}
			<LoadingIndicator
				label="Atualizando resultados..."
				size="1.25rem"
				showLabel={false}
				className="absolute left-3 top-1/2 -translate-y-1/2"
			/>
		{:else}
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-700-300" aria-hidden="true" />
		{/if}

		<input
			id={inputId}
			type="search"
			bind:value
			{placeholder}
			autocomplete="off"
			aria-label={placeholder}
			class="input h-12 w-full rounded-full border-surface-200-800 bg-surface-50-950 pl-10 pr-10 text-sm  placeholder:text-surface-700-300 transition-all hover:border-surface-300-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-wait disabled:opacity-70"
			disabled={loading}
		/>

		{#if value.trim() && !loading}
			<button
				type="button"
				onclick={clearSearch}
				class="btn-icon absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full preset-tonal-surface focus-visible:ring-2 focus-visible:ring-primary-500"
				aria-label="Limpar busca"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>
</div>
