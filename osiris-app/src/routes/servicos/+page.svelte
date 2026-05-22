<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { Search, Plus, Wrench, Users, MapPin, Briefcase } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';

    let activeTab = $state('mao_de_obra'); 
    let searchQuery = $state('');
    let loading = $state(true);
    let allServices = $state([]);
    
    let imgErrors = $state({}); 

    onMount(async () => {
        await fetchServices();
    });

    async function fetchServices() {
        loading = true;
        
        // 1. Pega o usuário logado atualmente
        const { data: { user } } = await supabase.auth.getUser();

        // Se não tiver ninguém logado, para a busca por aqui
        if (!user) {
            loading = false;
            return;
        }
        
        // 2. Busca apenas os serviços onde o dono é o usuário logado
        const { data, error } = await supabase
            .from('services')
            .select(`
                id, title, description, service_type, pricing_model, price, location,
                profiles (display_name, photo_url)
            `)
            .eq('owner_id', user.id) 
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar serviços:", error);
        }

        if (data) {
            allServices = data;
        }
        
        loading = false;
    }

    // Filtros reativos
    const filteredServices = $derived(
        allServices.filter(s => {
            const matchesTab = 
                (activeTab === 'mao_de_obra' && s.service_type === 'Mão de Obra') ||
                (activeTab === 'pacote_completo' && s.service_type === 'Pacote Completo');
            
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  s.description.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchesTab && matchesSearch;
        })
    );

    function formatPrice(price, model) {
        if (!price) return 'A Combinar';
        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
        return `${formatted} ${model !== 'Fixo' ? `/ ${model}` : ''}`;
    }
</script>

<div class="min-h-screen bg-gray-50 pb-20">
    <Header />

    <main class="px-4 py-4 max-w-3xl mx-auto w-full">
        <div class="mb-6 flex items-center justify-between">
            <h1 class="text-xl font-bold text-gray-900">Meus Serviços</h1>
            <a href="/servicos/novo" class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 shadow-sm transition-colors">
                <Plus class="h-4 w-4" />
                Oferecer Serviço
            </a>
        </div>

        <div class="mb-6 flex rounded-xl bg-gray-200 p-1">
            <button
                onclick={() => activeTab = 'mao_de_obra'}
                class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all {activeTab === 'mao_de_obra' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
                <Users class="h-4 w-4" />
                Mão de Obra
            </button>
            <button
                onclick={() => activeTab = 'pacote_completo'}
                class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all {activeTab === 'pacote_completo' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
                <Briefcase class="h-4 w-4" />
                Pacote Completo
            </button>
        </div>

        <div class="relative mb-6 shadow-sm">
            <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar nos meus serviços..." 
                bind:value={searchQuery} 
                class="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20" 
            />
        </div>

        {#if loading}
            <div class="flex justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        {:else}
            <div class="space-y-4">
                {#each filteredServices as serv (serv.id)}
                    <a href="/servicos/{serv.id}" class="block overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all">
                        <div class="p-4">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="font-bold text-gray-900">{serv.title}</h3>
                                <div class="text-right">
                                    <p class="font-bold text-green-700">{formatPrice(serv.price, serv.pricing_model)}</p>
                                </div>
                            </div>

                            <p class="text-sm text-gray-600 line-clamp-2 mb-4">{serv.description}</p>

                            <div class="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
                                <div class="flex items-center gap-2">
                                    <div class="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
                                        
                                        {#if serv.profiles?.photo_url && !imgErrors[serv.id]}
                                            <img 
                                                src={serv.profiles.photo_url} 
                                                alt={serv.profiles.display_name} 
                                                class="h-full w-full object-cover" 
                                                onerror={() => imgErrors[serv.id] = true}
                                            />
                                        {:else}
                                            <div class="h-full w-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                                                {serv.profiles?.display_name?.charAt(0) || '?'}
                                            </div>
                                        {/if}
                                        
                                    </div>
                                    <span class="text-xs font-medium text-gray-700">{serv.profiles?.display_name || 'Usuário'}</span>
                                </div>
                                
                                <div class="flex items-center gap-1 text-gray-500 text-xs">
                                    <MapPin class="h-3 w-3" />
                                    {serv.location}
                                </div>
                            </div>
                        </div>
                    </a>
                {:else}
                    <div class="text-center py-16 px-4">
                        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            {#if activeTab === 'mao_de_obra'}
                                <Users class="h-8 w-8 text-gray-400" />
                            {:else}
                                <Briefcase class="h-8 w-8 text-gray-400" />
                            {/if}
                        </div>
                        <h3 class="mb-1 text-lg font-medium text-gray-900">Nenhum serviço encontrado</h3>
                        <p class="text-sm text-gray-500">Você ainda não possui serviços cadastrados nesta categoria.</p>
                    </div>
                {/each}
            </div>
        {/if}
    </main>

    <BottomNav active="servicos" />
</div>