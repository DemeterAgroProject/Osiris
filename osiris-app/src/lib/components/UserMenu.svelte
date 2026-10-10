<script>
    import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Settings,
		User,
		Archive,
		Megaphone,
		MessageSquare,
		Heart,
		LogOut,
		Leaf
	} from 'lucide-svelte';
    import { supabase } from '$lib/supabase';
    import AppMenu from '$lib/components/ui/AppMenu.svelte';

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

    let { open = $bindable(false), triggerClass = '', trigger } = $props();

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

    const menuItems = $derived(
        !authUser && !loading
            ? []
            : [
                  { value: 'perfil', icon: User, label: 'Meu perfil', href: profileHref },
                  { value: 'favoritos', icon: Heart, label: 'Favoritos', href: '/favoritos' },
                  { value: 'negociacoes', icon: MessageSquare, label: 'Negociações', href: '/negociacoes' },
                  { value: 'inventario', icon: Archive, label: 'Meu inventário', href: '/inventario' },
                  { value: 'anunciar', icon: Megaphone, label: 'Anunciar', href: '/anunciar' },
                  { value: 'marketplace', icon: Leaf, label: 'Explorar marketplace', href: '/', separator: true },
                  {
                      value: 'sair',
                      icon: LogOut,
                      label: signingOut ? 'Saindo...' : 'Sair da conta',
                      danger: true,
                      separator: true,
                      disabled: signingOut,
                      onselect: handleSignOut
                  }
              ]
    );

    async function loadUserData() {
        if (!open) return;

        loading = true;
        imgError = false; // <-- NOVO: Reseta o erro sempre que o menu abrir
        
        const {
            data: { user }
        } = await supabase.auth.getUser();
        authUser = user;

        if (user) {
            const { data } = await supabase.from('profiles').select('id, display_name, photo_url').eq('id', user.id).maybeSingle();
            profile = data;
        } else {
            profile = null;
        }

        loading = false;
    }

    function closeMenu() {
        open = false;
    }

    async function handleSignOut() {
        signingOut = true;
        await supabase.auth.signOut();
        authUser = null;
        profile = null;
        signingOut = false;
        closeMenu();
        goto(resolve('/login'));
    }

    $effect(() => {
        if (open) loadUserData();
    });
</script>

<AppMenu
    bind:open
    items={menuItems}
    label="Abrir menu do usuário"
    variant="nav"
    {triggerClass}
    {trigger}
    contentClass="w-[min(100vw-1.5rem,20rem)]"
>
    {#snippet header()}
        {#if !authUser && !loading}
            <div class="px-4 py-6 text-center text-sm text-surface-600-400">Sessão encerrada.</div>
        {:else}
            <div class="mb-1 flex items-center gap-3 border-b border-surface-200-800 px-4 py-4">
                {#if avatarUrl && !imgError}
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        class="h-12 w-12 shrink-0 rounded-full object-cover"
                        onerror={() => (imgError = true)}
                    />
                {:else}
                    <div
                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full preset-filled-primary-500 text-sm font-bold"
                    >
                        {initials}
                    </div>
                {/if}

                <div class="min-w-0 flex-1">
                    {#if loading}
                        <div class="h-4 w-32 animate-pulse rounded bg-surface-200-800"></div>
                        <div class="mt-2 h-3 w-40 animate-pulse rounded bg-surface-200-800"></div>
                    {:else}
                        <p class="truncate text-sm font-bold text-surface-950-50">{displayName}</p>
                        <p class="truncate text-xs text-surface-600-400">{email}</p>
                    {/if}
                </div>

                <a
                    href={resolve(profileHref)}
                    onclick={closeMenu}
                    class="shrink-0 rounded-full p-2 text-surface-600-400 transition-colors hover:preset-tonal hover:text-surface-700-300"
                    aria-label="Configurações do perfil"
                >
                    <Settings class="h-5 w-5" />
                </a>
            </div>
        {/if}
    {/snippet}
</AppMenu>
