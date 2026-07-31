<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import {
        Archive,
        Bell,
        Home,
        Menu as MenuIcon,
        MoreHorizontal,
        Search,
        Toolbox,
        User,
        X
    } from 'lucide-svelte';
    import { Avatar, Dialog, Popover, Portal } from '@skeletonlabs/skeleton-svelte';
    import { supabase } from '$lib/supabase';
    import UserMenu from '$lib/components/UserMenu.svelte';

    function resolveDisplayName(profile, authUser) {
        return (
            profile?.display_name ||
            profile?.name ||
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

    let authUser = $state(null);
    let profile = $state(null);
    let menuOpen = $state(false);
    let navigationOpen = $state(false);
    let imgError = $state(false);
    /** @type {import('@supabase/supabase-js').RealtimeChannel | null} */
    let notificationsChannel = null;
    let notificationsUserId = null;

    // notificações
    let notifOpen = $state(false);
    let notifications = $state([]);
    let unreadCount = $derived(notifications.filter(n => !n.is_read).length);

    const isLoggedIn = $derived(Boolean(authUser));
    const displayName = $derived(resolveDisplayName(profile, authUser));
    const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
    const initials = $derived(resolveInitials(displayName));

    const desktopNavigation = [
        { label: 'Início', href: '/', icon: Home, relatedRoutes: ['/painel-de-controle'] },
        { label: 'Buscar', href: '/buscar', icon: Search, relatedRoutes: ['/anuncio'] },
        { label: 'Inventário', href: '/inventario', icon: Archive, relatedRoutes: ['/anunciar'] },
        { label: 'Serviços', href: '/servicos', icon: Toolbox, relatedRoutes: [] },
        {
            label: 'Mais',
            href: '/mais',
            icon: MoreHorizontal,
            relatedRoutes: ['/favoritos', '/negociacoes', '/operacoes', '/perfil', '/login']
        }
    ];

    async function refreshUser(sessionUser = undefined) {
        imgError = false;
        const user =
            sessionUser !== undefined
                ? sessionUser
                : (await supabase.auth.getUser()).data.user;
        authUser = user;

        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            profile = data;
            await loadNotifications(user.id);

            if (notificationsUserId !== user.id) {
                subscribeToNotifications(user.id);
                notificationsUserId = user.id;
            }
        } else {
            profile = null;
            menuOpen = false;
            notifications = [];
            notificationsUserId = null;
            unsubscribeFromNotifications();
        }
    }

    async function loadNotifications(userId) {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
        notifications = data ?? [];
    }

    function unsubscribeFromNotifications() {
        if (!notificationsChannel) return;
        supabase.removeChannel(notificationsChannel);
        notificationsChannel = null;
    }

    function subscribeToNotifications(userId) {
        unsubscribeFromNotifications();

        notificationsChannel = supabase
            .channel(`notifications:${userId}:${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                notifications = [payload.new, ...notifications];
            })
            .subscribe();
    }

    async function markAsRead(notification) {
        if (!notification.is_read) {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notification.id);
            notifications = notifications.map(n =>
                n.id === notification.id ? { ...n, is_read: true } : n
            );
        }
        if (notification.link) {
            notifOpen = false;
            goto(notification.link);
        }
    }

    async function markAllAsRead() {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);
        notifications = notifications.map(n => ({ ...n, is_read: true }));
    }

    function formatTime(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `${min}min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    }

    function handleNotificationOpenChange(details) {
        notifOpen = details.open;
        if (details.open) {
            menuOpen = false;
            navigationOpen = false;
        }
    }

    function openNavigation() {
        menuOpen = false;
        notifOpen = false;
        navigationOpen = true;
    }

    function closeNavigation() {
        navigationOpen = false;
    }

    function handleNavigationOpenChange(details) {
        navigationOpen = details.open;
    }

    function isNavigationItemActive(item) {
        const pathname = page.url.pathname;
        const isDirectRoute = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return isDirectRoute || item.relatedRoutes.some(
            (route) => pathname === route || pathname.startsWith(`${route}/`)
        );
    }

    onMount(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            refreshUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
            notificationsUserId = null;
            unsubscribeFromNotifications();
        };
    });
</script>

<header class="sticky top-0 z-50 border-b border-surface-200-800 bg-surface-50-950/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
            <button
                type="button"
                class="btn-icon hidden border border-surface-200-800 lg:inline-flex"
                onclick={openNavigation}
                aria-label="Abrir menu de navegação"
                aria-haspopup="dialog"
                aria-expanded={navigationOpen}
            >
                <MenuIcon class="size-5" />
            </button>

            <a href="/" class="flex h-10 w-10 items-center justify-center" aria-label="Início">
                <img src="/logo_black.png" alt="Logo Osiris" class="h-10" />
            </a>
        </div>

        <div class="flex items-center gap-3">
            <!-- Sininho -->
            <Popover
                open={notifOpen}
                onOpenChange={handleNotificationOpenChange}
                positioning={{ placement: 'bottom-end', gutter: 8 }}
            >
                <Popover.Trigger
                    class="relative rounded-full p-2 text-surface-700-300 transition-colors hover:preset-tonal"
                    aria-label="Notificações"
                >
                    <Bell class="h-6 w-6" />
                    {#if unreadCount > 0}
                        <span class="badge-icon absolute right-0 top-0 size-4 preset-filled-error-500 text-[10px] font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    {/if}
                </Popover.Trigger>

                <Portal>
                    <Popover.Positioner class="z-[60]">
                    <Popover.Content class="w-[min(22rem,calc(100vw-1.5rem))] rounded-container border border-surface-200-800 bg-surface-50-950 outline-none">
                        <!-- Cabeçalho -->
                        <div class="flex items-center justify-between border-b border-surface-200-800 px-4 py-3">
                            <Popover.Title class="text-sm font-semibold text-surface-950-50">Notificações</Popover.Title>
                            {#if unreadCount > 0}
                                <button
                                    type="button"
                                    onclick={markAllAsRead}
                                    class="text-xs font-medium text-primary-600 hover:text-primary-700"
                                >
                                    Marcar todas como lidas
                                </button>
                            {/if}
                        </div>

                        <!-- Lista -->
                        <div class="max-h-96 overflow-y-auto">
                            {#if notifications.length === 0}
                                <div class="flex flex-col items-center justify-center py-10 text-surface-700-300">
                                    <Bell class="mb-2 h-8 w-8 opacity-30" />
                                    <p class="text-sm">Nenhuma notificação</p>
                                </div>
                            {:else}
                                {#each notifications as notif}
                                    <button
                                        type="button"
                                        onclick={() => markAsRead(notif)}
                                        class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:preset-tonal {!notif.is_read ? 'preset-tonal-primary' : ''}"
                                    >
                                        <!-- Indicador de não lida -->
                                        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full {!notif.is_read ? 'bg-primary-500' : 'bg-transparent'}"></span>

                                        <div class="flex-1 overflow-hidden">
                                            <p class="truncate text-sm font-medium text-surface-950-50">{notif.title}</p>
                                            {#if notif.body}
                                                <p class="mt-0.5 truncate text-xs text-surface-700-300">{notif.body}</p>
                                            {/if}
                                        </div>

                                        <span class="shrink-0 text-xs text-surface-700-300">{formatTime(notif.created_at)}</span>
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover>

            <!-- Avatar -->
            {#if isLoggedIn}
                <UserMenu bind:open={menuOpen}>
                    {#snippet trigger()}
                    <Avatar class="size-9 border border-surface-200-800">
                        {#if avatarUrl && !imgError}
                            <Avatar.Image src={avatarUrl} alt={displayName} onerror={() => imgError = true} />
                        {/if}
                        <Avatar.Fallback class="preset-filled-primary-500 text-xs font-bold">
                            {initials}
                        </Avatar.Fallback>
                    </Avatar>
                    {/snippet}
                </UserMenu>
            {:else}
                <button
                    type="button"
                    onclick={() => goto('/login')}
                    class="rounded-full p-0.5 transition-colors hover:preset-tonal"
                    aria-label="Fazer login"
                >
                    <span class="flex h-10 w-10 items-center justify-center rounded-full text-surface-700-300">
                        <User class="h-6 w-6" />
                    </span>
                </button>
            {/if}
        </div>
    </div>
</header>

<Dialog open={navigationOpen} onOpenChange={handleNavigationOpenChange}>
    {#if navigationOpen}
        <Portal>
            <Dialog.Backdrop class="fixed inset-0 z-[80] bg-surface-950/40 backdrop-blur-sm" />
            <Dialog.Positioner class="fixed inset-0 z-[90] flex justify-start">
                <Dialog.Content
                    class="flex h-full w-80 max-w-[85vw] flex-col border-r border-surface-200-800 bg-surface-50-950 outline-none"
                >
                    <div class="flex items-center justify-between border-b border-surface-200-800 px-5 py-4">
                        <div class="flex items-center gap-3">
                            <img src="/logo_black.png" alt="" class="h-9 w-auto" />
                            <Dialog.Title class="text-lg font-semibold text-surface-950-50">
                                Navegação
                            </Dialog.Title>
                        </div>

                        <button
                            type="button"
                            class="btn-icon border border-surface-200-800"
                            onclick={closeNavigation}
                            aria-label="Fechar menu de navegação"
                        >
                            <X class="size-5" />
                        </button>
                    </div>

                    <Dialog.Description class="sr-only">
                        Acesse as principais áreas do aplicativo Osiris.
                    </Dialog.Description>

                    <nav class="flex-1 p-3" aria-label="Navegação principal do desktop">
                        <ul class="space-y-1">
                            {#each desktopNavigation as item}
                                {@const Icon = item.icon}
                                {@const active = isNavigationItemActive(item)}
                                <li>
                                    <a
                                        href={item.href}
                                        onclick={closeNavigation}
                                        aria-current={active ? 'page' : undefined}
                                        class="flex min-h-12 items-center gap-3 rounded-container px-4 py-3 font-medium transition-colors {active
                                            ? 'preset-tonal-primary text-primary-700-300'
                                            : 'text-surface-700-300 hover:preset-tonal'}"
                                    >
                                        <Icon class="size-5 shrink-0" />
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    </nav>

                    <div class="border-t border-surface-200-800 px-5 py-4 text-sm text-surface-600-400">
                        Marketplace e gestão para o agronegócio.
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    {/if}
</Dialog>
