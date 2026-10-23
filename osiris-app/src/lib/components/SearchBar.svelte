<script>
	import { Search, X } from 'lucide-svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		value = $bindable(''),
		placeholder = m.busca_placeholder(),
		loading = false,
		inputId = 'marketplace-search'
	} = $props();

	let input = $state(null);

	// limpar devolve o foco ao campo para a pessoa digitar outra busca
	function clearSearch() {
		value = '';
		input?.focus();
	}
</script>

<div class="px-4 pb-2 pt-3 sm:px-6 lg:px-8">
	<div class="relative mx-auto max-w-7xl">
		{#if loading}
			<LoadingIndicator
				label={m.busca_atualizando()}
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
			bind:this={input}
			bind:value
			{placeholder}
			autocomplete="off"
			aria-label={placeholder}
			class="input h-13 w-full rounded-container border-surface-200-800 bg-surface-50-950 pl-11 pr-12 text-base shadow-sm placeholder:text-surface-800-200 transition-all hover:border-surface-300-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&::-webkit-search-cancel-button]:appearance-none"
		/>

		{#if value.trim()}
			<button
				type="button"
				onclick={clearSearch}
				class="btn-icon preset-tonal absolute right-2 top-1/2 -translate-y-1/2"
				title={m.busca_limpar_busca()}
				aria-label={m.busca_limpar_busca()}
			>
				<X size={18} />
			</button>
		{/if}
	</div>
</div>
