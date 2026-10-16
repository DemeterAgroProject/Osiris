<script>
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import {
        ArrowLeft,
        Bell,
        BellRing,
        CheckCheck,
        CircleCheck,
        CircleX,
        Handshake,
        MessageCircle,
        Star,
        Tractor,
        User
    } from 'lucide-svelte';
    import { supabase } from '$lib/supabase';
    import { watchChanges } from '$lib/realtime';
    import UserMenu from '$lib/components/UserMenu.svelte';
    import AppPopover from '$lib/components/ui/AppPopover.svelte';
    
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

    // ícone e cor de cada tipo de notificação (os tipos vêm dos triggers do banco)
    const NOTIFICATION_STYLES = {
        nova_negociacao: { icon: Handshake, tone: 'preset-tonal-primary' },
        negociacao_aceita: { icon: CircleCheck, tone: 'preset-tonal-success' },
        negociacao_recusada: { icon: CircleX, tone: 'preset-tonal-error' },
        negociacao_cancelada: { icon: CircleX, tone: 'preset-tonal-error' },
        nova_mensagem: { icon: MessageCircle, tone: 'preset-tonal-secondary' },
        status_reserva: { icon: Tractor, tone: 'preset-tonal-primary' },
        operacao_cancelada: { icon: CircleX, tone: 'preset-tonal-error' },
        nova_avaliacao: { icon: Star, tone: 'preset-tonal-warning' }
    };
    const DEFAULT_NOTIFICATION_STYLE = { icon: BellRing, tone: 'preset-tonal-surface' };

    function notificationStyle(type) {
        return NOTIFICATION_STYLES[type] ?? DEFAULT_NOTIFICATION_STYLE;
    }

    /**
     * title: nome da tela, mostrado ao lado do logo.
     * backHref: quando informado, mostra a seta de voltar no lugar do logo.
     * backUsesHistory: a seta volta para a tela anterior (history.back); aberto direto por um link, vai para backHref.
     */
    let { title = '', backHref = '', backUsesHistory = false } = $props();

    let authUser = $state(null);
    let profile = $state(null);
    let menuOpen = $state(false);
    let imgError = $state(false);
    /** @type {(() => void) | null} */
    let stopWatchingNotifications = null;
    let notificationsUserId = null;

    // notificações
    let notifOpen = $state(false);
    let notifications = $state([]);
    let unreadCount = $derived(notifications.filter(n => !n.is_read).length);

    const isLoggedIn = $derived(Boolean(authUser));
    const displayName = $derived(resolveDisplayName(profile, authUser));
    const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
    const initials = $derived(resolveInitials(displayName));

    async function refreshUser(sessionUser = undefined) {
        imgError = false;
        const user =
            sessionUser !== undefined
                ? sessionUser
                : (await supabase.auth.getUser()).data.user;
        authUser = user;

        if (user) {
            const { data } = await supabase.from('profiles').select('id, display_name, photo_url').eq('id', user.id).maybeSingle();
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
        if (!stopWatchingNotifications) return;
        stopWatchingNotifications();
        stopWatchingNotifications = null;
    }

    function subscribeToNotifications(userId) {
        unsubscribeFromNotifications();

        stopWatchingNotifications = watchChanges(
            `notifications:${userId}:${Date.now()}`,
            [{ event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }],
            (payload) => {
                if (!payload) {
                    loadNotifications(userId);
                } else if (!notifications.some((n) => n.id === payload.new.id)) {
                    notifications = [payload.new, ...notifications];
                }
            }
        );
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
        // link vem do banco: só navega para rotas internas do app
        if (notification.link?.startsWith('/') && !notification.link.startsWith('//')) {
            notifOpen = false;
            goto(resolve(notification.link));
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

<header class="sticky top-0 z-50 border-b border-surface-200-800 bg-surface-50-950/95 px-4 py-2.5 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
            {#if backHref}
                <a
                    href={resolve(backHref)}
                    onclick={(event) => {
                        if (backUsesHistory && history.length > 1) {
                            event.preventDefault();
                            history.back();
                        }
                    }}
                    class="btn-icon btn-icon-lg preset-tonal shrink-0"
                    title="Voltar"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={18} />
                </a>
            {:else}
                <a href={resolve('/')} class="flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Início">
                    <img src="/logo_black.png" alt="Logo Osiris" class="h-10" />
                </a>
            {/if}

            {#if title}
                <div class="min-w-0 leading-tight">
                    <p class="text-primary-600-400 preset-typo-label">Osiris</p>
                    <p class="truncate text-lg font-bold leading-tight text-surface-950-50">{title}</p>
                </div>
            {/if}
        </div>

        <div class="flex shrink-0 items-center gap-1">
            <AppPopover
                bind:open={notifOpen}
                title="Notificações"
                label={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : 'Notificações'}
                triggerClass="btn-icon btn-icon-lg rounded-full relative data-[state=open]:preset-tonal-primary"
                contentClass="w-[22rem]"
            >
                {#snippet trigger()}
                    <Bell size={18} />
                    {#if unreadCount > 0}
                        <span class="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full preset-filled-error-500 px-1 text-xs font-bold ring-2 ring-surface-50-950">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    {/if}
                {/snippet}

                {#snippet actions()}
                    {#if unreadCount > 0}
                        <button
                            type="button"
                            onclick={markAllAsRead}
                            class="btn btn-sm preset-tonal-primary"
                        >
                            <CheckCheck size={18} />
                            <span>Marcar todas como lidas</span>
                        </button>
                    {/if}
                {/snippet}

                <div class="max-h-[min(28rem,70vh)] overflow-y-auto overscroll-contain">
                    {#if notifications.length === 0}
                        <div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-surface-800-200">
                            <span class="flex h-14 w-14 items-center justify-center rounded-full preset-tonal-surface">
                                <Bell class="h-7 w-7 opacity-60" />
                            </span>
                            <p class="text-sm font-semibold text-surface-950-50">Nenhuma notificação</p>
                            <p class="text-xs">Avisos de propostas, mensagens e operações aparecem aqui.</p>
                        </div>
                    {:else}
                        <ul class="divide-y divide-surface-200-800">
                            {#each notifications as notif (notif.id)}
                                {@const style = notificationStyle(notif.type)}
                                <li>
                                    <button
                                        type="button"
                                        onclick={() => markAsRead(notif)}
                                        class="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:preset-tonal {!notif.is_read ? 'bg-primary-500/5' : ''}"
                                    >
                                        <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-container {style.tone}">
                                            <style.icon class="h-5 w-5" />
                                            {#if !notif.is_read}
                                                <span class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary-500 ring-2 ring-surface-50-950">
                                                    <span class="sr-only">Não lida</span>
                                                </span>
                                            {/if}
                                        </span>

                                        <span class="min-w-0 flex-1">
                                            <span class="flex items-start justify-between gap-2">
                                                <span class="line-clamp-2 text-sm text-surface-950-50 {!notif.is_read ? 'font-bold' : 'font-medium'}">{notif.title}</span>
                                                <span class="shrink-0 pt-0.5 text-xs text-surface-800-200">{formatTime(notif.created_at)}</span>
                                            </span>
                                            {#if notif.body}
                                                <span class="mt-0.5 line-clamp-2 block text-sm leading-snug text-surface-900-100">{notif.body}</span>
                                            {/if}
                                        </span>
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </AppPopover>

            <!-- Avatar -->
            {#if isLoggedIn}
                <UserMenu
                    bind:open={menuOpen}
                    triggerClass="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:preset-tonal data-[state=open]:ring-2 data-[state=open]:ring-primary-500"
                >
                    {#snippet trigger()}
                        {#if avatarUrl && !imgError}
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                class="h-9 w-9 rounded-full border-2 border-primary-500/30 object-cover"
                                onerror={() => imgError = true}
                            />
                        {:else}
                            <div class="flex h-9 w-9 items-center justify-center rounded-full preset-filled-primary-500 text-xs font-bold">
                                {initials}
                            </div>
                        {/if}
                    {/snippet}
                </UserMenu>
            {:else if !page.url.pathname.startsWith('/login')}
                <button
                    type="button"
                    onclick={() => goto(resolve('/login'))}
                    class="btn preset-filled-primary-500"
                >
                    <User size={18} />
                    <span>Entrar</span>
                </button>
            {/if}
        </div>
    </div>
</header>
