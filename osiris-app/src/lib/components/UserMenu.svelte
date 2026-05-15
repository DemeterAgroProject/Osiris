<script>
	import { goto } from '$app/navigation';
	import {
		Settings,
		User,
		Archive,
		Megaphone,
		LogOut,
		ChevronRight,
		Leaf
	} from 'lucide-svelte';
	import { supabase } from '$lib/supabase';
	function resolveDisplayName(profile, authUser) {
		return (
			profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
			authUser?.user_metadata?.full_name ||
			authUser?.user_metadata?.name ||
			authUser?.email?.split('@')[0] ||
			'Usuário'
		);
	}

	function resolveAvatarUrl(profile, authUser) {
		return (
			profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			authUser?.user_metadata?.avatar_url ||
			null
		);
	}

	function resolveInitials(name) {
		return (
			name
				.split(' ')
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase())
				.join('') || 'U'
		);
	}

	let { open = $bindable(false) } = $props();

	let authUser = $state(null);
	let profile = $state(null);
	let loading = $state(false);
	let signingOut = $state(false);

	const displayName = $derived(resolveDisplayName(profile, authUser));
	const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
	const initials = $derived(resolveInitials(displayName));
	const email = $derived(profile?.email || authUser?.email || '');
	const profileHref = $derived(authUser ? `/login/usuario/${authUser.id}` : '/login');

	const menuSections = $derived([
		[
			{ icon: User, label: 'Meu perfil', href: profileHref },
			{ icon: Archive, label: 'Meu inventário', href: '/inventario' },
			{ icon: Megaphone, label: 'Anunciar', href: '/anunciar' }
		],
		[{ icon: Leaf, label: 'Explorar marketplace', href: '/' }]
	]);

	async function loadUserData() {
		if (!open) return;

		loading = true;
		const {
			data: { user }
		} = await supabase.auth.getUser();
		authUser = user;

		if (user) {
			const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
			profile = data;
		} else {
			profile = null;
		}

		loading = false;
	}

	function closeMenu() {
		open = false;
	}

	function navigate(href) {
		closeMenu();
		goto(href);
	}

	async function handleSignOut() {
		signingOut = true;
		await supabase.auth.signOut();
		authUser = null;
		profile = null;
		signingOut = false;
		closeMenu();
		goto('/login');
	}

	$effect(() => {
		if (open) loadUserData();
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') closeMenu();
	}}
/>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-[60] border-0 bg-black/40 p-0"
		onclick={closeMenu}
		aria-label="Fechar menu"
	></button>

	<div
		class="fixed right-3 top-[3.75rem] z-[70] w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
		role="menu"
		aria-label="Menu do usuário"
	>
		{#if !authUser && !loading}
			<div class="px-4 py-6 text-center text-sm text-gray-500">Sessão encerrada.</div>
		{:else}
		<!-- Cabeçalho: avatar + dados + configurações -->
		<div class="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
			{#if avatarUrl}
				<img src={avatarUrl} alt={displayName} class="h-12 w-12 shrink-0 rounded-full object-cover" />
			{:else}
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-sm font-bold text-white"
				>
					{initials}
				</div>
			{/if}

			<div class="min-w-0 flex-1">
				{#if loading}
					<div class="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
					<div class="mt-2 h-3 w-40 animate-pulse rounded bg-gray-100"></div>
				{:else}
					<p class="truncate text-sm font-bold text-gray-900">{displayName}</p>
					<p class="truncate text-xs text-gray-500">{email}</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => navigate(profileHref)}
				class="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
				aria-label="Configurações do perfil"
			>
				<Settings class="h-5 w-5" />
			</button>
		</div>

		<!-- Itens do menu -->
		{#each menuSections as section, sectionIndex (sectionIndex)}
			<div class="py-1" role="none">
				{#each section as item (item.label)}
					<button
						type="button"
						role="menuitem"
						onclick={() => navigate(item.href)}
						class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
					>
						<item.icon class="h-5 w-5 shrink-0 text-gray-600" />
						<span class="flex-1 font-medium">{item.label}</span>
						<ChevronRight class="h-4 w-4 text-gray-300" />
					</button>
				{/each}
			</div>
			{#if sectionIndex < menuSections.length - 1}
				<div class="border-t border-gray-100" role="separator"></div>
			{/if}
		{/each}

		<div class="border-t border-gray-100 py-1" role="none">
			<button
				type="button"
				role="menuitem"
				onclick={handleSignOut}
				disabled={signingOut}
				class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
			>
				<LogOut class="h-5 w-5 shrink-0" />
				<span>{signingOut ? 'Saindo...' : 'Sair da conta'}</span>
			</button>
		</div>
		{/if}
	</div>
{/if}
