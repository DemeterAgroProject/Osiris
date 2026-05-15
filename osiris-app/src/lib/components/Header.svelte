<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Bell, User } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import { resolveAvatarUrl, resolveInitials, resolveDisplayName } from '$lib/profile.js';

	let authUser = $state(null);
	let profile = $state(null);
	let menuOpen = $state(false);

	const isLoggedIn = $derived(Boolean(authUser));
	const displayName = $derived(resolveDisplayName(profile, authUser));
	const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
	const initials = $derived(resolveInitials(displayName));

	async function refreshUser() {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		authUser = user;

		if (user) {
			const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
			profile = data;
		} else {
			profile = null;
			menuOpen = false;
		}
	}

	function handleProfileClick() {
		if (isLoggedIn) {
			menuOpen = !menuOpen;
		} else {
			goto('/login');
		}
	}

	onMount(() => {
		refreshUser();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(() => {
			refreshUser();
		});

		return () => subscription.unsubscribe();
	});
</script>

<header class="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
	<div class="flex items-center justify-between">
		<a href="/" class="flex h-10 w-10 items-center justify-center" aria-label="Início">
			<img src="/logo_black.png" alt="Logo Osiris" class="h-10" />
		</a>

		<div class="flex items-center gap-3">
			<button
				type="button"
				class="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
				aria-label="Notificações"
			>
				<Bell class="h-6 w-6" />
				<span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
			</button>

			<button
				type="button"
				onclick={handleProfileClick}
				class="rounded-full p-0.5 transition-colors hover:bg-gray-100 {isLoggedIn && menuOpen
					? 'ring-2 ring-green-500 ring-offset-1'
					: ''}"
				aria-label={isLoggedIn ? 'Abrir menu do usuário' : 'Fazer login'}
				aria-expanded={isLoggedIn ? menuOpen : undefined}
				aria-haspopup={isLoggedIn ? 'menu' : undefined}
			>
				{#if isLoggedIn && avatarUrl}
					<img
						src={avatarUrl}
						alt={displayName}
						class="h-9 w-9 rounded-full border border-gray-200 object-cover"
					/>
				{:else if isLoggedIn}
					<div
						class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-xs font-bold text-white"
					>
						{initials}
					</div>
				{:else}
					<span class="flex h-10 w-10 items-center justify-center rounded-full text-gray-600">
						<User class="h-6 w-6" />
					</span>
				{/if}
			</button>
		</div>
	</div>

	<UserMenu bind:open={menuOpen} />
</header>
