<script>
	import { Search } from 'lucide-svelte';

	let searchQuery = $state('');
</script>

<div class="px-4 py-3">
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Buscar produtos e serviços..."
			class="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
		/>
	</div>
</div>
