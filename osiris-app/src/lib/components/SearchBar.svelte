<script>
	import { Search, Loader2, X } from 'lucide-svelte';

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

<div class="border-gray-100 px-4 py-3">
	<div class="relative mx-auto max-w-3xl">
		{#if loading}
			<Loader2
				class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-green-600"
				aria-hidden="true"
			/>
		{:else}
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
		{/if}

		<input
			id={inputId}
			type="search"
			bind:value
			{placeholder}
			autocomplete="off"
			aria-label={placeholder}
			class="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-70"
			disabled={loading}
		/>

		{#if value.trim() && !loading}
			<button
				type="button"
				onclick={clearSearch}
				class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				aria-label="Limpar busca"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>
</div>
