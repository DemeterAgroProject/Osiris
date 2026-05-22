<script>
	import { Home, Search, Archive, Toolbox, MoreHorizontal } from 'lucide-svelte';

	let { active = 'inicio' } = $props();

	const navItems = [
		{ id: 'inicio', label: 'Início', icon: Home, href: '/' },
		{ id: 'buscar', label: 'Buscar', icon: Search, href: '/buscar' },
		{ id: 'inventario', label: 'Inventário', icon: Archive, href: '/inventario' },
		{ id: 'servicos', label: 'Serviços', icon: Toolbox, href: '/servicos' },
		{ id: 'mais', label: 'Mais', icon: MoreHorizontal, href: '/mais' },
	];
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
	<div class="flex items-center justify-around py-2">
		{#each navItems as item (item.id)}
				{@const Icon = item.icon}
				<a
				href={item.href}
				class="flex flex-col items-center gap-1 px-2 py-1 transition-colors {active === item.id
					? 'text-green-600'
					: 'text-gray-500 hover:text-gray-700'}"
			>
					{#if active === item.id}
						<div class="rounded-full bg-green-100 p-2">
							<Icon class="h-5 w-5" />
						</div>
					{:else}
						<Icon class="h-6 w-6" />
					{/if}
				<span class="text-[10px] font-medium">{item.label}</span>
			</a>
		{/each}
	</div>

	<!-- Safe area padding for iOS -->
	<div class="h-safe-area-inset-bottom bg-white"></div>
</nav>
