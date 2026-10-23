<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import {
        Home,
        Search,
        LayoutDashboard,
        Archive,
        MessageSquare,
        Heart,
        User,
        Megaphone,
        Tractor,
        Briefcase,
        PlusCircle,
        Leaf,
        LogIn,
        LogOut,
        ChevronRight,
        Settings,
        Shield,
        CircleHelp,
        Languages,
        Check
    } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import { supabase } from '$lib/supabase';
    import { m } from '$lib/paraglide/messages';
    import { getLocale } from '$lib/paraglide/runtime';
    import { LANGUAGES, changeLanguage } from '$lib/i18n';

    function resolveDisplayName(profile, authUser) {
        return (
            profile?.display_name ||
            authUser?.user_metadata?.full_name ||
            authUser?.user_metadata?.name ||
            authUser?.email?.split('@')[0] ||
            m.app_usuario()
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

    let loading = $state(true);
    let authUser = $state(null);
    let profile = $state(null);
    let signingOut = $state(false);
    let imgError = $state(false); 

    const displayName = $derived(resolveDisplayName(profile, authUser));
    const avatarUrl = $derived(resolveAvatarUrl(profile, authUser));
    const initials = $derived(resolveInitials(displayName));
    const isLoggedIn = $derived(Boolean(authUser));
    const profileHref = $derived(authUser ? `/perfil/${authUser.id}` : '/login');

    const shortcuts = [
        { icon: Home, label: m.app_mais_marketplace(), href: '/' },
        { icon: Search, label: m.app_mais_buscar_ofertas(), href: '/buscar' }
    ];

    const activityItems = $derived(
        isLoggedIn
            ? [
                  { icon: LayoutDashboard, label: m.app_painel_controle(), href: '/painel-de-controle' },
                  { icon: Archive, label: m.app_meu_inventario(), href: '/inventario' },
                  { icon: Heart, label: m.app_favoritos(), href: '/favoritos' },
                  { icon: MessageSquare, label: m.app_negociacoes(), href: '/negociacoes' },
                  { icon: User, label: m.app_meu_perfil(), href: profileHref },
                  { icon: Megaphone, label: m.app_mais_anunciar_produto(), href: '/anunciar' }
              ]
            : [
                  { icon: LogIn, label: m.app_mais_entrar_conta(), href: '/login' },
                  { icon: Megaphone, label: m.app_mais_anunciar_produto(), href: '/login?redirect=/anunciar' }
              ]
    );

    const discoverItems = [
        { icon: Tractor, label: m.app_mais_maquinario(), href: '/buscar?tipo=maquinario' },
        { icon: Leaf, label: m.app_mais_insumos(), href: '/buscar?tipo=produto' },
        { icon: Briefcase, label: m.app_mais_servicos_agro(), href: '/buscar?tipo=servico' }
    ];

    const sellItems = $derived(
        isLoggedIn
            ? [
                  { icon: PlusCircle, label: m.app_mais_anunciar_inventario(), href: '/anunciar' },
                  { icon: Briefcase, label: m.app_mais_cadastrar_servico(), href: '/servicos/novo' },
                  { icon: Settings, label: m.app_config_perfil(), href: profileHref }
              ]
            : [
                  { icon: PlusCircle, label: m.app_mais_comecar_anunciar(), href: '/login?redirect=/anunciar' },
                  { icon: Briefcase, label: m.app_mais_oferecer_servicos(), href: '/login?redirect=/servicos/novo' }
              ]
    );

    const helpItems = [{ icon: CircleHelp, label: m.app_central_ajuda(), href: '/ajuda' }];

    // idioma: changeLanguage salva a escolha (cookie e perfil) e recarrega a página traduzida
    const currentLocale = getLocale();
    let changingLanguage = $state(false);

    async function selectLanguage(code) {
        if (code === currentLocale || changingLanguage) return;
        changingLanguage = true;
        await changeLanguage(code);
    }

    async function refreshUser() {
        loading = true;
        imgError = false; 

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

    async function handleSignOut() {
        signingOut = true;
        await supabase.auth.signOut();
        authUser = null;
        profile = null;
        signingOut = false;
        goto(resolve('/login'));
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

<svelte:head>
    <title>{m.nav_mais()} — Osiris</title>
    <meta name="description" content={m.app_mais_meta_desc()} />
</svelte:head>

{#snippet badge(item)}
    <span
        class="badge rounded-full px-2 py-0.5 uppercase text-xs font-bold tracking-wide {item.badgeTone === 'accent'
            ? 'preset-filled-primary-500'
            : 'preset-tonal-surface'}"
    >
        {item.badge}
    </span>
{/snippet}

{#snippet menuRow(item)}
    {#if item.href}
        <a
            href={resolve(item.href)}
            class="flex min-h-16 items-center gap-3 px-4 py-3 text-surface-950-50 transition-colors hover:preset-tonal"
        >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container preset-tonal-primary">
                <item.icon class="h-5 w-5" strokeWidth={2} />
            </span>
            <span class="flex-1 text-base font-semibold">{item.label}</span>
            {#if item.badge}
                {@render badge(item)}
            {:else}
                <ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300" />
            {/if}
        </a>
    {:else}
        <div
            class="flex min-h-16 items-center gap-3 px-4 py-3 text-surface-800-200"
            aria-disabled="true"
        >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container bg-surface-100-900">
                <item.icon class="h-5 w-5" strokeWidth={2} />
            </span>
            <span class="flex-1 text-base font-medium">{item.label}</span>
            {#if item.badge}
                {@render badge(item)}
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet menuGroup(id, title, items)}
    <section aria-labelledby={id}>
        <h2 id={id} class="px-1 pb-2 preset-typo-label">{title}</h2>
        <nav
            aria-label={title}
            class="divide-y divide-surface-200-800 overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
        >
            {#each items as item (item.label)}
                {@render menuRow(item)}
            {/each}
        </nav>
    </section>
{/snippet}

<div class="min-h-screen pb-24">
    <Header title={m.nav_mais()} />

    <section class="bg-gradient-to-br from-primary-600 to-primary-800 px-4 pb-5 pt-3 text-primary-50">
        <div class="mx-auto max-w-3xl">
            {#if loading}
                <div class="flex items-center gap-3 py-4">
                    <div class="h-16 w-16 animate-pulse rounded-full bg-white/20"></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-4 w-36 animate-pulse rounded bg-white/20"></div>
                        <div class="h-3 w-24 animate-pulse rounded bg-white/15"></div>
                    </div>
                </div>
            {:else if isLoggedIn}
                <a
                    href={resolve(profileHref)}
                    class="flex items-center gap-3 rounded-container py-3 transition-opacity hover:opacity-95"
                >
                    {#if avatarUrl && !imgError}
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            class="h-16 w-16 shrink-0 rounded-full border-2 border-white/40 object-cover"
                            onerror={() => imgError = true}
                        />
                    {:else}
                        <div
                            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/15 text-xl font-bold"
                        >
                            {initials}
                        </div>
                    {/if}
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-xl font-bold">{displayName}</p>
                        <p class="mt-0.5 flex items-center gap-1 text-sm font-medium opacity-90">
                            {m.app_ver_meu_perfil()}
                            <ChevronRight class="h-4 w-4" />
                        </p>
                    </div>
                </a>
            {:else}
                <div class="py-3">
                    <p class="text-xl font-bold">{m.app_mais_ola_visitante()}</p>
                    <p class="mt-1 text-sm opacity-90">{m.app_mais_visitante_desc()}</p>
                    <a
                        href={resolve('/login')}
                        class="btn btn-md preset-filled-surface-50-950 mt-4"
                    >
                        <LogIn size={18} />
                        <span>{m.app_mais_entrar_google()}</span>
                    </a>
                </div>
            {/if}

            <div class="mt-2 grid gap-2 {isLoggedIn ? 'grid-cols-2' : 'grid-cols-1'}">
                <a
                    href={resolve('/anunciar')}
                    class="flex min-h-20 flex-col justify-between gap-2 rounded-container bg-white/15 p-3 transition-colors hover:bg-white/20"
                >
                    <Megaphone class="h-6 w-6" />
                    <span>
                        <span class="block text-sm font-bold">{m.nav_anunciar()}</span>
                        <span class="block text-xs opacity-90">{m.app_mais_anunciar_desc()}</span>
                    </span>
                </a>

                {#if isLoggedIn}
                    <a
                        href={resolve('/painel-de-controle')}
                        class="flex min-h-20 flex-col justify-between gap-2 rounded-container bg-white p-3 text-primary-800 shadow-sm transition-colors hover:bg-primary-50"
                    >
                        <LayoutDashboard class="h-6 w-6" />
                        <span>
                            <span class="block text-sm font-bold">{m.app_mais_painel()}</span>
                            <span class="block text-xs opacity-80">{m.app_mais_painel_desc()}</span>
                        </span>
                    </a>
                {/if}
            </div>
        </div>
    </section>

    <main class="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {@render menuGroup('mais-atalhos', m.app_mais_atalhos(), shortcuts)}
        {@render menuGroup('mais-atividade', m.app_mais_minha_atividade(), activityItems)}
        {@render menuGroup('mais-descubra', m.app_mais_descubra(), discoverItems)}
        {@render menuGroup('mais-vender', m.app_mais_vender_gerir(), sellItems)}
        {@render menuGroup('mais-ajuda', m.app_mais_ajuda(), helpItems)}

        <section aria-labelledby="mais-idioma">
            <h2 id="mais-idioma" class="px-1 pb-2 preset-typo-label">{m.idioma_titulo()}</h2>
            <div
                role="radiogroup"
                aria-labelledby="mais-idioma"
                class="divide-y divide-surface-200-800 overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm"
            >
                {#each LANGUAGES as language (language.code)}
                    {@const selected = language.code === currentLocale}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        lang={language.code}
                        disabled={changingLanguage}
                        onclick={() => selectLanguage(language.code)}
                        class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left text-surface-950-50 transition-colors hover:preset-tonal disabled:opacity-60"
                    >
                        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container {selected ? 'preset-filled-primary-500' : 'preset-tonal-primary'}">
                            <Languages class="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span class="flex-1 text-base {selected ? 'font-bold' : 'font-semibold'}">{language.label}</span>
                        {#if selected}
                            <Check class="h-5 w-5 shrink-0 text-primary-700-300" aria-hidden="true" />
                            <span class="sr-only">{m.app_idioma_atual()}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </section>

        {#if isLoggedIn}
            <button
                type="button"
                onclick={handleSignOut}
                disabled={signingOut}
                class="btn btn-lg preset-tonal-error w-full"
            >
                <LogOut size={18} />
                <span>{signingOut ? m.app_saindo() : m.app_sair_conta()}</span>
            </button>
        {/if}

        <section aria-labelledby="mais-info" class="px-1 pb-2">
            <h2 id="mais-info" class="sr-only">{m.app_mais_informacoes()}</h2>
            <div class="flex items-center gap-2 text-sm text-surface-800-200">
                <Shield class="h-4 w-4" />
                <span>{m.app_mais_slogan()}</span>
            </div>
            <div class="mt-3 flex gap-4 text-sm">
                <a href={resolve('/termos')} class="font-semibold text-surface-900-100 underline hover:text-primary-700-300">{m.app_termos_uso()}</a>
                <a href={resolve('/privacidade')} class="font-semibold text-surface-900-100 underline hover:text-primary-700-300">{m.app_politica_privacidade()}</a>
            </div>
        </section>
    </main>

    <BottomNav active="mais" />
</div>
