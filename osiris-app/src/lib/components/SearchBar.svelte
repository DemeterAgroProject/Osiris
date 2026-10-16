<script>
	import { Search, X } from 'lucide-svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

	let {
		value = $bindable(''),
		placeholder = 'O que você procura?',
		loading = false,
		inputId = 'marketplace-search'
	} = $props();

	function clearSearch() {
		value = '';
	}
</script>

<div class="px-4 pb-2 pt-3 sm:px-6 lg:px-8">
	<div class="relative mx-auto max-w-7xl">
		{#if loading}
			<LoadingIndicator
				label="Atualizando resultados..."
				size="1.25rem"
				showLabel={false}
				className="absolute left-3 top-1/2 -translate-y-1/2"
			/>
		{:else}
			<Search class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-700-300" aria-hidden="true" />
		{/if}

		<input
			id={inputId}
			type="search"
			bind:value
			{placeholder}
			autocomplete="off"
			aria-label={placeholder}
			class="input h-13 w-full rounded-container border-surface-200-800 bg-surface-50-950 pl-11 pr-12 text-base shadow-sm placeholder:text-surface-800-200 transition-all hover:border-surface-300-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-wait disabled:opacity-70"
			disabled={loading}
		/>

		{#if value.trim() && !loading}
			<button
				type="button"
				onclick={clearSearch}
				class="btn-icon preset-tonal absolute right-2 top-1/2 -translate-y-1/2"
				title="Limpar busca"
				aria-label="Limpar busca"
			>
				<X size={18} />
			</button>
		{/if}
	</div>
</div>
