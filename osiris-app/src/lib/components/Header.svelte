<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { Bell, User } from 'lucide-svelte';
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
    let imgError = $state(false);

    // notificações
    let notifOpen = $state(false);
    let notifications = $state([]);
    let unreadCount = $derived(notifications.filter(n => !n.is_read).length);

    const isLoggedIn = $derived(Boolean(authUser));
    const displayName = $derived(resolveDisplayName(profile, authUser));
    const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
    const initials = $derived(resolveInitials(displayName));

    async function refreshUser() {
        imgError = false;
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;

        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            profile = data;
            await loadNotifications(user.id);
            subscribeToNotifications(user.id);
        } else {
            profile = null;
            menuOpen = false;
            notifications = [];
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

    function subscribeToNotifications(userId) {
        supabase
            .channel('notifications')
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

    function handleProfileClick() {
        if (isLoggedIn) {
            menuOpen = !menuOpen;
            notifOpen = false;
        } else {
            goto('/login');
        }
    }

    function toggleNotif() {
        notifOpen = !notifOpen;
        menuOpen = false;
    }

    onMount(() => {
        refreshUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
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
            <!-- Sininho -->
            <div class="relative">
                <button
                    type="button"
                    onclick={toggleNotif}
                    class="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                    aria-label="Notificações"
                >
                    <Bell class="h-6 w-6" />
                    {#if unreadCount > 0}
                        <span class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    {/if}
                </button>

                <!-- Dropdown de notificações -->
                {#if notifOpen}
                    <!-- Overlay para fechar ao clicar fora -->
                    <button
                        type="button"
                        class="fixed inset-0 z-40"
                        aria-label="Fechar notificações"
                        onclick={() => notifOpen = false}
                    ></button>

                    <div class="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-lg">
                        <!-- Cabeçalho -->
                        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                            <h2 class="text-sm font-semibold text-gray-900">Notificações</h2>
                            {#if unreadCount > 0}
                                <button
                                    type="button"
                                    onclick={markAllAsRead}
                                    class="text-xs font-medium text-green-600 hover:text-green-700"
                                >
                                    Marcar todas como lidas
                                </button>
                            {/if}
                        </div>

                        <!-- Lista -->
                        <div class="max-h-96 overflow-y-auto">
                            {#if notifications.length === 0}
                                <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <Bell class="mb-2 h-8 w-8 opacity-30" />
                                    <p class="text-sm">Nenhuma notificação</p>
                                </div>
                            {:else}
                                {#each notifications as notif}
                                    <button
                                        type="button"
                                        onclick={() => markAsRead(notif)}
                                        class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 {!notif.is_read ? 'bg-green-50' : ''}"
                                    >
                                        <!-- Indicador de não lida -->
                                        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full {!notif.is_read ? 'bg-green-500' : 'bg-transparent'}"></span>

                                        <div class="flex-1 overflow-hidden">
                                            <p class="truncate text-sm font-medium text-gray-900">{notif.title}</p>
                                            {#if notif.body}
                                                <p class="mt-0.5 truncate text-xs text-gray-500">{notif.body}</p>
                                            {/if}
                                        </div>

                                        <span class="shrink-0 text-xs text-gray-400">{formatTime(notif.created_at)}</span>
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Avatar -->
            <button
                type="button"
                onclick={handleProfileClick}
                class="rounded-full p-0.5 transition-colors hover:bg-gray-100 {isLoggedIn && menuOpen ? 'ring-2 ring-green-500 ring-offset-1' : ''}"
                aria-label={isLoggedIn ? 'Abrir menu do usuário' : 'Fazer login'}
                aria-expanded={isLoggedIn ? menuOpen : undefined}
                aria-haspopup={isLoggedIn ? 'menu' : undefined}
            >
                {#if isLoggedIn && avatarUrl && !imgError}
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        class="h-9 w-9 rounded-full border border-gray-200 object-cover"
                        onerror={() => imgError = true}
                    />
                {:else if isLoggedIn}
                    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-xs font-bold text-white">
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