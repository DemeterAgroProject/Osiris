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

<nav
	class="fixed inset-x-0 bottom-0 z-50 border-t border-surface-200-800 bg-surface-50-950/95 backdrop-blur-xl"
	aria-label="Navegação principal"
>
	<div class="mx-auto flex max-w-screen-sm items-center justify-around px-2 py-1.5">
		{#each navItems as item (item.id)}
				{@const Icon = item.icon}
				<a
				href={item.href}
				aria-current={active === item.id ? 'page' : undefined}
				class="group flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 border-t-2 px-2 py-1 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 {active === item.id
					? 'border-primary-500 text-primary-600-400'
					: 'border-transparent text-surface-700-300 hover:bg-surface-100-900 hover:text-surface-900-100'}"
			>
				<Icon class="h-5 w-5" aria-hidden="true" />
				<span class="text-[10px] font-semibold tracking-wide">{item.label}</span>
			</a>
		{/each}
	</div>

	<!-- Safe area padding for iOS -->
	<div class="h-safe-area-inset-bottom bg-surface-50-950"></div>
</nav>
