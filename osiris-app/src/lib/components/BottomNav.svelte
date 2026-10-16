<script>
	import { resolve } from '$app/paths';
	import { Home, Search, Archive, Toolbox, Menu } from 'lucide-svelte';

	let { active = 'inicio' } = $props();

	const navItems = [
		{ id: 'inicio', label: 'Início', icon: Home, href: '/' },
		{ id: 'buscar', label: 'Buscar', icon: Search, href: '/buscar' },
		{ id: 'inventario', label: 'Inventário', icon: Archive, href: '/inventario' },
		{ id: 'servicos', label: 'Serviços', icon: Toolbox, href: '/servicos' },
		{ id: 'mais', label: 'Mais', icon: Menu, href: '/mais' },
	];
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-200-800 bg-surface-50-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur"
	aria-label="Navegação principal"
>
	<div class="mx-auto flex max-w-xl items-stretch justify-around px-1">
		{#each navItems as item (item.id)}
			{@const Icon = item.icon}
			{@const isActive = active === item.id}
			<a
				href={resolve(item.href)}
				aria-current={isActive ? 'page' : undefined}
				class="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors {isActive
					? 'text-primary-700-300'
					: 'text-surface-800-200 hover:text-surface-950-50'}"
			>
				<span
					class="flex h-8 w-14 items-center justify-center rounded-full transition-colors {isActive
						? 'preset-tonal-primary'
						: ''}"
				>
					<Icon class="h-6 w-6" strokeWidth={isActive ? 2.25 : 1.75} />
				</span>
				<span class="text-xs {isActive ? 'font-bold' : 'font-medium'}">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
