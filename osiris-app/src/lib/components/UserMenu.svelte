<script>
    import { goto } from '$app/navigation';
	import {
		Settings,
		User,
		Archive,
		Megaphone,
		MessageSquare,
		Heart,
		LogOut,
		ChevronRight,
		Leaf
	} from 'lucide-svelte';
    import { supabase } from '$lib/supabase';
    import { Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';

    function resolveDisplayName(profile, authUser) {
        return (
            profile?.display_name ||
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

    let { open = $bindable(false), trigger } = $props();

    let authUser = $state(null);
    let profile = $state(null);
    let loading = $state(false);
    let signingOut = $state(false);
    let imgError = $state(false);

    const displayName = $derived(resolveDisplayName(profile, authUser));
    const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
    const initials = $derived(resolveInitials(displayName));
    const email = $derived(profile?.email || authUser?.email || '');
    const profileHref = $derived(authUser ? `/login/usuario/${authUser.id}` : '/login');

	const menuSections = $derived([
		[
			{ icon: User, label: 'Meu perfil', href: profileHref },
			{ icon: Heart, label: 'Favoritos', href: '/favoritos' },
			{ icon: MessageSquare, label: 'Negociações', href: '/negociacoes' },
			{ icon: Archive, label: 'Meu inventário', href: '/inventario' },
			{ icon: Megaphone, label: 'Anunciar', href: '/anunciar' }
		]
        
    ]);

    async function loadUserData() {
        if (!open) return;

        loading = true;
        imgError = false; // <-- NOVO: Reseta o erro sempre que o menu abrir

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

    function handleOpenChange(details) {
        open = details.open;
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

<Menu {open} onOpenChange={handleOpenChange} positioning={{ placement: 'bottom-end', gutter: 8 }}>
    <Menu.Trigger
        class="rounded-full p-0.5 transition-colors hover:preset-tonal {open ? 'ring-2 ring-primary-500 ring-offset-1' : ''}"
        aria-label="Abrir menu do usuário"
    >
        {@render trigger()}
    </Menu.Trigger>
    <Portal>
        <Menu.Positioner class="z-[70]">
        <Menu.Content
            class="w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 outline-none"
            aria-label="Menu do usuário"
        >
        {#if !authUser && !loading}
            <div class="px-4 py-6 text-center text-sm text-surface-700-300">Sessão encerrada.</div>
        {:else}
        <div class="flex items-center gap-3 border-b border-surface-200-800 px-4 py-4">

            <Avatar class="size-12 shrink-0 border border-surface-200-800">
                {#if avatarUrl && !imgError}
                    <Avatar.Image src={avatarUrl} alt={displayName} onerror={() => imgError = true} />
                {/if}
                <Avatar.Fallback class="preset-filled-primary-500 text-sm font-bold">
                    {initials}
                </Avatar.Fallback>
            </Avatar>

            <div class="min-w-0 flex-1">
                {#if loading}
                    <div class="h-4 w-32 animate-pulse rounded bg-surface-200-800"></div>
                    <div class="mt-2 h-3 w-40 animate-pulse rounded bg-surface-200-800"></div>
                {:else}
                    <p class="truncate text-sm font-bold text-surface-950-50">{displayName}</p>
                    <p class="truncate text-xs text-surface-700-300">{email}</p>
                {/if}
            </div>

            <Menu.Item
                value="profile-settings"
                onclick={() => navigate(profileHref)}
                class="shrink-0 rounded-full p-2 text-surface-700-300 transition-colors hover:preset-tonal hover:text-surface-700-300"
                aria-label="Configurações do perfil"
            >
                <Settings class="h-5 w-5" />
            </Menu.Item>
        </div>

        {#each menuSections as section, sectionIndex (sectionIndex)}
            <Menu.ItemGroup class="py-1">
                {#each section as item (item.label)}
                    <Menu.Item
                        value={item.href}
                        onclick={() => navigate(item.href)}
                        class="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_1rem] items-center gap-3 px-4 py-3 text-left text-sm text-surface-950-50 transition-colors hover:preset-tonal"
                    >
                        <item.icon class="size-5 shrink-0 self-center text-surface-700-300" />
                        <Menu.ItemText class="min-w-0 font-medium leading-5">{item.label}</Menu.ItemText>
                        <ChevronRight class="size-4 shrink-0 self-center text-surface-700-300" />
                    </Menu.Item>
                {/each}
            </Menu.ItemGroup>
            {#if sectionIndex < menuSections.length - 1}
                <Menu.Separator class="border-t border-surface-200-800" />
            {/if}
        {/each}

        <div class="border-t border-surface-200-800 py-1">
            <Menu.Item
                value="sign-out"
                onclick={handleSignOut}
                disabled={signingOut}
                class="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left text-sm font-medium text-error-500 transition-colors hover:preset-tonal-error disabled:opacity-60"
            >
                <LogOut class="size-5 shrink-0 self-center" />
                <Menu.ItemText class="min-w-0 leading-5">
                    {signingOut ? 'Saindo...' : 'Sair da conta'}
                </Menu.ItemText>
            </Menu.Item>
        </div>
        {/if}
        </Menu.Content>
        </Menu.Positioner>
    </Portal>
</Menu>
