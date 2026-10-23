<script module>
	import { supabase } from '$lib/supabase';

	// sessão compartilhada entre as barras de todas as telas: a barra não pisca ao trocar de página
	const session = $state({ checked: false, loggedIn: false });
	let listening = false;

	function watchSession() {
		if (listening || typeof window === 'undefined') return;
		listening = true;
		supabase.auth.getSession().then(({ data }) => {
			session.loggedIn = Boolean(data.session?.user);
			session.checked = true;
		});
		supabase.auth.onAuthStateChange((_event, authSession) => {
			session.loggedIn = Boolean(authSession?.user);
			session.checked = true;
		});
	}
</script>

<script>
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { Home, Search, Archive, Menu, Plus, CircleHelp, LogIn } from 'lucide-svelte';
	import { m } from '$lib/paraglide/messages';

	let { active = 'inicio' } = $props();

	onMount(watchSession);

	// rótulos guardam a função da mensagem (m.nav_*), chamada no template: o texto sai no idioma atual
	// quem entrou: o "Anunciar" fica no meio, em destaque
	const MEMBER_ITEMS = [
		{ id: 'inicio', label: m.nav_inicio, icon: Home, href: '/' },
		{ id: 'buscar', label: m.nav_buscar, icon: Search, href: '/buscar' },
		{ id: 'anunciar', label: m.nav_anunciar, icon: Plus, href: '/anunciar', featured: true },
		{ id: 'inventario', label: m.nav_inventario, icon: Archive, href: '/inventario' },
		{ id: 'mais', label: m.nav_mais, icon: Menu, href: '/mais' }
	];

	// visitante: "Sobre" abre a apresentação do app
	const VISITOR_ITEMS = [
		{ id: 'inicio', label: m.nav_inicio, icon: Home, href: '/' },
		{ id: 'buscar', label: m.nav_buscar, icon: Search, href: '/buscar' },
		{ id: 'sobre', label: m.nav_sobre, icon: CircleHelp, href: '/boas-vindas' },
		{ id: 'entrar', label: m.nav_entrar, icon: LogIn, href: '/login' }
	];

	const navItems = $derived(session.loggedIn ? MEMBER_ITEMS : VISITOR_ITEMS);
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-surface-200-800 bg-surface-50-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur"
	aria-label={m.nav_navegacao_principal()}
>
	<div class="mx-auto flex min-h-16 max-w-xl items-stretch justify-around px-1">
		{#if session.checked}
			{#each navItems as item (item.id)}
				{@const Icon = item.icon}
				{@const isActive = active === item.id}
				{#if item.featured}
					<a
						href={resolve(item.href)}
						aria-current={isActive ? 'page' : undefined}
						class="flex flex-1 flex-col items-center justify-end gap-1 pb-2 text-primary-700-300"
					>
						<span
							class="-mt-6 flex h-14 w-14 items-center justify-center rounded-full preset-filled-primary-500 shadow-lg ring-4 ring-surface-50-950"
						>
							<Icon class="h-7 w-7" strokeWidth={2.5} />
						</span>
						<span class="text-xs font-bold">{item.label()}</span>
					</a>
				{:else}
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
						<span class="text-xs {isActive ? 'font-bold' : 'font-medium'}">{item.label()}</span>
					</a>
				{/if}
			{/each}
		{/if}
	</div>
</nav>
