<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
    import {
        TrendingUp, Eye, Package, Tractor, Briefcase,
        MessageCircle, PlusCircle, ArrowRight, Leaf, MessageSquare, Calendar
    } from 'lucide-svelte';

    let loading = $state(true);
    let userName = $state('Anunciante');

    let stats = $state({
        maquinarios: 0,
        produtos: 0,
        servicos: 0
    });

    onMount(async () => {
        try {
            loading = true;
            const { data: { user } } = await supabase.auth.getUser();

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
            const [maqRes, prodRes, servRes] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('category', 'Maquinário').eq('status', 'ativo'),
                supabase.from('products').select('*', { count: 'exact', head: true }).neq('category', 'Maquinário').eq('owner_id', user.id).eq('status', 'ativo'),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'ativo')
            ]);

            stats = {
                maquinarios: maqRes.count || 0,
                produtos: prodRes.count || 0,
                servicos: servRes.count || 0
            };

        } catch (err) {
            console.error("Erro no Dashboard:", err);
        } finally {
            loading = false;
        }
    });

    const totalAds = $derived(stats.maquinarios + stats.produtos + stats.servicos);
</script>

<div class="min-h-screen bg-surface-50-950 pb-24 lg:pb-0">
    <Header />

    <main class="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">

        <div>
            <span class="badge preset-tonal-primary">Painel de controle</span>
            <h1 class="mt-3 text-2xl font-bold tracking-tight text-surface-950-50">Olá, {userName}!</h1>
            <p class="mt-1 text-sm text-surface-700-300">Aqui está o resumo dos seus negócios no Osíris.</p>
        </div>

        {#if loading}
            <div class="card rounded-container border border-surface-200-800 py-12">
                <LoadingIndicator label="Carregando resumo..." />
            </div>
        {:else}
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div class="card col-span-2 flex items-center justify-between overflow-hidden rounded-container border border-primary-200-800 p-5  preset-tonal-primary">
                    <div>
                        <p class="text-surface-700-300 text-sm font-medium">Total de Anúncios Ativos</p>
                        <p class="text-3xl font-bold mt-1">{totalAds}</p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-50/70  backdrop-blur-sm dark:bg-surface-950/30">
                        <TrendingUp class="h-6 w-6" aria-hidden="true" />
                    </div>
                </div>

                <div class="card flex flex-col justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4">
                    <div class="flex justify-between items-start">
                        <div class="h-8 w-8 rounded-full preset-tonal-secondary flex items-center justify-center">
                            <Eye class="h-4 w-4" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl font-bold">124</p>
                        <p class="text-xs text-surface-700-300 font-medium mt-0.5">Visitas este mês</p>
                    </div>
                </div>

                <div class="card flex flex-col justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4">
                    <div class="flex justify-between items-start">
                        <div class="h-8 w-8 rounded-full preset-tonal-warning flex items-center justify-center">
                            <MessageCircle class="h-4 w-4" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl font-bold">3</p>
                        <p class="text-xs text-surface-700-300 font-medium mt-0.5">Novos contatos</p>
                    </div>
                </div>
            </div>

            <div>
                <h2 class="mb-3 text-base font-bold tracking-tight">Seu Portfólio</h2>
                <div class="grid grid-cols-3 gap-3">
                    <div class="card rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center ">
                        <Tractor class="h-5 w-5 mx-auto text-primary-600 mb-2" />
                        <p class="text-xl font-bold">{stats.maquinarios}</p>
                        <p class="text-[10px] font-semibold text-surface-700-300 uppercase tracking-wider mt-1">Máquinas</p>
                    </div>
                    <div class="card rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center ">
                        <Leaf class="h-5 w-5 mx-auto mb-2 text-warning-500" />
                        <p class="text-xl font-bold">{stats.produtos}</p>
                        <p class="text-[10px] font-semibold text-surface-700-300 uppercase tracking-wider mt-1">Insumos</p>
                    </div>
                    <div class="card rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-center ">
                        <Briefcase class="h-5 w-5 mx-auto mb-2 text-secondary-500" />
                        <p class="text-xl font-bold">{stats.servicos}</p>
                        <p class="text-[10px] font-semibold text-surface-700-300 uppercase tracking-wider mt-1">Serviços</p>
                    </div>
                </div>
            </div>

            <div>
                <h2 class="mb-3 text-base font-bold tracking-tight">Ações Rápidas</h2>
                <div class="grid gap-3 md:grid-cols-2">
                    <a href="/painel-de-controle/agenda" class="card group flex items-center justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all hover:border-primary-300-700 focus-visible:ring-2 focus-visible:ring-primary-500">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-container preset-tonal-secondary flex items-center justify-center">
                                <Calendar class="h-5 w-5" />
                            </div>
                            <div>
                                <p class="font-semibold">Agenda</p>
                                <p class="text-xs text-surface-700-300">Propostas, negociações e operações</p>
                            </div>
                        </div>
                        <ArrowRight class="h-5 w-5 text-surface-700-300" />
                    </a>

                    <a href="/negociacoes" class="card group flex items-center justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all hover:border-primary-300-700 focus-visible:ring-2 focus-visible:ring-primary-500">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-container preset-tonal-warning flex items-center justify-center">
                                <MessageSquare class="h-5 w-5" />
                            </div>
                            <div>
                                <p class="font-semibold">Negociações</p>
                                <p class="text-xs text-surface-700-300">Propostas, chat e operações</p>
                            </div>
                        </div>
                        <ArrowRight class="h-5 w-5 text-surface-700-300" />
                    </a>

                    <a href="/anunciar" class="card group flex items-center justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all hover:border-primary-300-700 focus-visible:ring-2 focus-visible:ring-primary-500">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-container preset-tonal-primary flex items-center justify-center">
                                <Package class="h-5 w-5" />
                            </div>
                            <div>
                                <p class="font-semibold">Anunciar Produto/Máquina</p>
                                <p class="text-xs text-surface-700-300">Adicionar item ao inventário</p>
                            </div>
                        </div>
                        <PlusCircle class="h-5 w-5 text-surface-700-300" />
                    </a>

                    <a href="/servicos/novo" class="card group flex items-center justify-between rounded-container border border-surface-200-800 bg-surface-50-950 p-4 transition-all hover:border-primary-300-700 focus-visible:ring-2 focus-visible:ring-primary-500">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-container preset-tonal-secondary flex items-center justify-center">
                                <Briefcase class="h-5 w-5" />
                            </div>
                            <div>
                                <p class="font-semibold">Oferecer Serviço</p>
                                <p class="text-xs text-surface-700-300">Mão de obra ou pacote completo</p>
                            </div>
                        </div>
                        <PlusCircle class="h-5 w-5 text-surface-700-300" />
                    </a>
                </div>
            </div>
        {/if}
    </main>

    <BottomNav active="inicio" />
</div>
