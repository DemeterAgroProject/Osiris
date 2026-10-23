<script>
    import { resolve } from '$app/paths';
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { requireUser } from '$lib/auth';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import { 
        TrendingUp, Package, Tractor, Briefcase,
        MessageCircle, PlusCircle, ArrowRight, Leaf, MessageSquare, Calendar,
        ChevronRight, Store
    } from 'lucide-svelte';
    import { m } from '$lib/paraglide/messages';

    let loading = $state(true);
    let userName = $state(m.operacao_anunciante());
    
    let stats = $state({
        maquinarios: 0,
        produtos: 0,
        servicos: 0,
        propostas: 0,
        operacoes: 0
    });

    onMount(async () => {
        try {
            loading = true;
            const user = await requireUser('/painel-de-controle');
            if (!user) return; 

            // 1. Busca o nome do usuário
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', user.id)
                .single();
            
            if (profile?.display_name) {
                userName = profile.display_name.split(' ')[0];
            }

            // 2. Faz as contagens em paralelo
            const [maqRes, prodRes, servRes, propostasRes, operacoesRes] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('category', 'Maquinário').eq('status', 'ativo'),
                supabase.from('products').select('*', { count: 'exact', head: true }).neq('category', 'Maquinário').eq('owner_id', user.id).eq('status', 'ativo'),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'ativo'),
                supabase.from('negotiations').select('id', { count: 'exact', head: true }).eq('provider_id', user.id).eq('status', 'solicitada'),
                supabase.from('bookings').select('id', { count: 'exact', head: true }).or(`provider_id.eq.${user.id},client_id.eq.${user.id}`).in('status', ['pendente', 'em_operacao'])
            ]);

            stats = {
                maquinarios: maqRes.count || 0,
                produtos: prodRes.count || 0,
                servicos: servRes.count || 0,
                propostas: propostasRes.count || 0,
                operacoes: operacoesRes.count || 0
            };

        } catch (err) {
            console.error("Erro no Dashboard:", err);
        } finally {
            loading = false;
        }
    });

    const totalAds = $derived(stats.maquinarios + stats.produtos + stats.servicos);
</script>

<svelte:head>
	<title>{m.operacao_painel()} — Osiris</title>
</svelte:head>

{#snippet quickAction(href, Icon, tone, title, hint, TrailIcon)}
    <a
        href={resolve(href)}
        class="flex min-h-18 items-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-3 shadow-sm transition-colors hover:border-primary-500"
    >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-container {tone}">
            <Icon class="h-6 w-6" />
        </span>
        <span class="min-w-0 flex-1">
            <span class="block text-base font-bold text-surface-950-50">{title}</span>
            <span class="block truncate text-sm text-surface-800-200">{hint}</span>
        </span>
        <TrailIcon class="h-5 w-5 shrink-0 text-surface-700-300" />
    </a>
{/snippet}

<div class="min-h-screen pb-24">
    <Header title={m.operacao_painel()} />

    <main class="mx-auto w-full max-w-3xl space-y-6 px-4 py-5">
        <div>
            <h1 class="preset-typo-headline">{m.operacao_ola({ nome: userName })}</h1>
            <p class="mt-1 preset-typo-subtitle">{m.operacao_painel_resumo()}</p>
        </div>

        {#if loading}
            <div class="space-y-3" role="status" aria-live="polite">
                <span class="sr-only">{m.operacao_carregando_painel()}</span>
                <div class="placeholder h-28 w-full animate-pulse rounded-container"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="placeholder h-28 animate-pulse rounded-container"></div>
                    <div class="placeholder h-28 animate-pulse rounded-container"></div>
                </div>
            </div>
        {:else}
            <div class="grid grid-cols-2 gap-3">
                <a
                    href={resolve('/inventario')}
                    class="relative col-span-2 overflow-hidden rounded-container bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-primary-50 shadow-md"
                >
                    <TrendingUp class="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 opacity-10" aria-hidden="true" />
                    <div class="flex items-center gap-3">
                        <span class="flex h-11 w-11 items-center justify-center rounded-container bg-white/15">
                            <Store class="h-6 w-6" />
                        </span>
                        <p class="text-base font-bold">{m.operacao_anuncios_ativos()}</p>
                    </div>
                    <p class="mt-3 text-5xl font-bold leading-none">{totalAds}</p>
                    <p class="mt-3 flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
                        {m.operacao_gerenciar()}
                        <ChevronRight class="h-4 w-4" />
                    </p>
                </a>

                <a href={resolve('/negociacoes')} class="flex flex-col justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500">
                    <span class="flex h-11 w-11 items-center justify-center rounded-container preset-tonal-warning">
                        <MessageCircle class="h-5 w-5" />
                    </span>
                    <div class="mt-3">
                        <p class="text-3xl font-bold text-surface-950-50">{stats.propostas}</p>
                        <p class="mt-0.5 text-sm font-medium text-surface-800-200">{m.operacao_propostas_aguardando()}</p>
                    </div>
                </a>

                <a href={resolve('/negociacoes')} class="flex flex-col justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500">
                    <span class="flex h-11 w-11 items-center justify-center rounded-container preset-tonal-secondary">
                        <Calendar class="h-5 w-5" />
                    </span>
                    <div class="mt-3">
                        <p class="text-3xl font-bold text-surface-950-50">{stats.operacoes}</p>
                        <p class="mt-0.5 text-sm font-medium text-surface-800-200">{m.operacao_operacoes_andamento()}</p>
                    </div>
                </a>
            </div>

            <section>
                <h2 class="mb-3 preset-typo-title">{m.operacao_seu_portfolio()}</h2>
                <div class="grid grid-cols-3 gap-3">
                    {#each [
                        { id: 'maquinas', label: m.operacao_maquinas(), value: stats.maquinarios, icon: Tractor, tone: 'preset-tonal-primary', href: '/inventario' },
                        { id: 'insumos', label: m.operacao_insumos(), value: stats.produtos, icon: Leaf, tone: 'preset-tonal-tertiary', href: '/inventario' },
                        { id: 'servicos', label: m.operacao_servicos(), value: stats.servicos, icon: Briefcase, tone: 'preset-tonal-secondary', href: '/servicos' }
                    ] as item (item.id)}
                        <a
                            href={resolve(item.href)}
                            class="flex flex-col items-center rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center shadow-sm transition-colors hover:border-primary-500"
                        >
                            <span class="flex h-11 w-11 items-center justify-center rounded-container {item.tone}">
                                <item.icon class="h-5 w-5" />
                            </span>
                            <span class="mt-2 text-2xl font-bold text-surface-950-50">{item.value}</span>
                            <span class="text-xs font-semibold text-surface-800-200">{item.label}</span>
                        </a>
                    {/each}
                </div>
            </section>

            <section>
                <h2 class="mb-3 preset-typo-title">{m.operacao_acoes_rapidas()}</h2>
                <div class="space-y-3">
                    {@render quickAction('/painel-de-controle/agenda', Calendar, 'preset-tonal-secondary', m.operacao_agenda(), m.operacao_agenda_dica(), ArrowRight)}
                    {@render quickAction('/negociacoes', MessageSquare, 'preset-tonal-warning', m.operacao_negociacoes(), m.operacao_negociacoes_dica(), ArrowRight)}
                    {@render quickAction('/anunciar', Package, 'preset-tonal-primary', m.operacao_anunciar_produto(), m.operacao_anunciar_produto_dica(), PlusCircle)}
                    {@render quickAction('/servicos/novo', Briefcase, 'preset-tonal-secondary', m.operacao_oferecer_servico(), m.operacao_oferecer_servico_dica(), PlusCircle)}
                </div>
            </section>
        {/if}
    </main>

    <BottomNav active="mais" />
</div>
