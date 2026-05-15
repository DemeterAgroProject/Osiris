<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import { 
        TrendingUp, Eye, Package, Tractor, Briefcase, 
        MessageCircle, PlusCircle, ArrowRight, Leaf 
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

<div class="min-h-screen bg-gray-50 pb-20">
    <Header />

    <main class="px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
        
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Olá, {userName}!</h1>
            <p class="text-sm text-gray-500 mt-1">Aqui está o resumo dos seus negócios no Osíris.</p>
        </div>

        {#if loading}
            <div class="flex justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        {:else}
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 p-5 text-black shadow-md">
                    <div>
                        <p class="text-gray-500 text-sm font-medium">Total de Anúncios Ativos</p>
                        <p class="text-3xl font-bold mt-1">{totalAds}</p>
                    </div>
                    <div class="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center backdrop-blur-sm">
                        <TrendingUp class="h-6 w-6 text-black" />
                    </div>
                </div>

                <div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div class="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Eye class="h-4 w-4 text-blue-600" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl font-bold text-gray-900">124</p>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">Visitas este mês</p>
                    </div>
                </div>

                <div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div class="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                            <MessageCircle class="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl font-bold text-gray-900">3</p>
                        <p class="text-xs text-gray-500 font-medium mt-0.5">Novos contatos</p>
                    </div>
                </div>
            </div>

            <div>
                <h2 class="text-base font-bold text-gray-900 mb-3">Seu Portfólio</h2>
                <div class="grid grid-cols-3 gap-3">
                    <div class="rounded-xl bg-white p-3 border border-gray-100 text-center shadow-sm">
                        <Tractor class="h-5 w-5 mx-auto text-green-600 mb-2" />
                        <p class="text-xl font-bold text-gray-900">{stats.maquinarios}</p>
                        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Máquinas</p>
                    </div>
                    <div class="rounded-xl bg-white p-3 border border-gray-100 text-center shadow-sm">
                        <Leaf class="h-5 w-5 mx-auto text-amber-600 mb-2" />
                        <p class="text-xl font-bold text-gray-900">{stats.produtos}</p>
                        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Insumos</p>
                    </div>
                    <div class="rounded-xl bg-white p-3 border border-gray-100 text-center shadow-sm">
                        <Briefcase class="h-5 w-5 mx-auto text-blue-600 mb-2" />
                        <p class="text-xl font-bold text-gray-900">{stats.servicos}</p>
                        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Serviços</p>
                    </div>
                </div>
            </div>

            <div>
                <h2 class="text-base font-bold text-gray-900 mb-3">Ações Rápidas</h2>
                <div class="space-y-3">
                    <a href="/anunciar" class="flex items-center justify-between rounded-xl bg-white p-4 border border-gray-100 shadow-sm hover:border-green-300 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                                <Package class="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p class="font-semibold text-gray-900">Anunciar Produto/Máquina</p>
                                <p class="text-xs text-gray-500">Adicionar item ao inventário</p>
                            </div>
                        </div>
                        <PlusCircle class="h-5 w-5 text-gray-400" />
                    </a>

                    <a href="/servicos/novo" class="flex items-center justify-between rounded-xl bg-white p-4 border border-gray-100 shadow-sm hover:border-blue-300 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Briefcase class="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p class="font-semibold text-gray-900">Oferecer Serviço</p>
                                <p class="text-xs text-gray-500">Mão de obra ou pacote completo</p>
                            </div>
                        </div>
                        <PlusCircle class="h-5 w-5 text-gray-400" />
                    </a>
                </div>
            </div>
        {/if}
    </main>

    <BottomNav active="inicio" />
</div>