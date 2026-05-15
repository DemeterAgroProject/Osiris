<script>
    import { goto } from '$app/navigation';
    import { supabase } from '$lib/supabase';
    import { ChevronRight, Users, Briefcase, MapPin } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';

    let currentStep = $state(0);
    const totalSteps = 3;
    let loading = $state(false);
    let message = $state({ text: '', type: '' });

    let form = $state({
        service_type: '', // 'Mão de Obra' ou 'Pacote Completo'
        title: '',
        description: '',
        location: 'Alegrete e Região, RS', // Padrão regional do Osíris
        pricing_model: 'Por Hora', // 'Por Hora', 'Por Hectare', 'Empreitada/Fixo', 'A Combinar'
        price: null
    });

    function canProceed() {
        if (currentStep === 0) return form.service_type !== '';
        if (currentStep === 1) return form.title.trim().length > 0 && form.description.trim().length > 0 && form.location.trim().length > 0;
        if (currentStep === 2) {
            if (form.pricing_model === 'A Combinar') return true;
            return form.price !== null && form.price > 0;
        }
        return true;
    }

    function nextStep() {
        if (currentStep < totalSteps - 1 && canProceed()) currentStep++;
    }

    function prevStep() {
        if (currentStep > 0) currentStep--;
        else goto('/servicos');
    }

    async function handleSubmit() {
        loading = true;
        message = { text: '', type: '' };

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            message = { text: 'Você precisa estar logado para oferecer um serviço.', type: 'error' };
            loading = false;
            return;
        }

        // Se for "A Combinar", garantimos que o preço vai vazio para o banco
        const finalPrice = form.pricing_model === 'A Combinar' ? null : form.price;

        const { error } = await supabase.from('services').insert({
            owner_id: user.id,
            title: form.title,
            description: form.description,
            service_type: form.service_type,
            pricing_model: form.pricing_model,
            price: finalPrice,
            location: form.location,
            status: 'ativo'
        });

        if (error) {
            console.error("Erro ao salvar serviço:", error);
            message = { text: 'Ocorreu um erro ao publicar o serviço. Tente novamente.', type: 'error' };
            loading = false;
        } else {
            message = { text: 'Serviço publicado com sucesso no Osíris!', type: 'success' };
            setTimeout(() => goto('/servicos'), 2000);
        }
    }
</script>

<div class="flex min-h-screen flex-col bg-gray-50 pb-20">
    <Header /> 

    <main class="flex flex-1 flex-col px-4 py-4 max-w-2xl mx-auto w-full">
        <h1 class="mb-6 text-center text-xl font-bold text-gray-900">Oferecer Serviço</h1>

        {#if message.text}
            <div class="p-4 mb-4 rounded-lg {message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                {message.text}
            </div>
        {/if}

        {#if currentStep === 0}
            <div class="flex flex-1 flex-col">
                <p class="mb-2 text-sm text-gray-500">Etapa 1 de 3</p>
                <h2 class="mb-4 text-base text-gray-600">Como você vai atuar?</h2>

                <div class="space-y-3">
                    <button
                        onclick={() => form.service_type = 'Mão de Obra'}
                        class="flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all {form.service_type === 'Mão de Obra' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700">
                            <Users class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-gray-900">Mão de Obra</h3>
                            <p class="text-xs text-gray-500">Apenas o operador ou trabalhador (ex: tratorista, capataz)</p>
                        </div>
                    </button>

                    <button
                        onclick={() => form.service_type = 'Pacote Completo'}
                        class="flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all {form.service_type === 'Pacote Completo' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Briefcase class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-gray-900">Pacote Completo</h3>
                            <p class="text-xs text-gray-500">Serviço com maquinário/insumos inclusos (ex: plantio de eucalipto)</p>
                        </div>
                    </button>
                </div>
            </div>

        {:else if currentStep === 1}
            <div class="flex flex-1 flex-col">
                <p class="mb-2 text-sm text-gray-500">Etapa 2 de 3</p>
                <h2 class="mb-4 text-lg font-semibold text-gray-900">Detalhes do Serviço</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="title">Título do Serviço</label>
                        <input 
                            type="text" 
                            id="title" 
                            bind:value={form.title} 
                            placeholder={form.service_type === 'Mão de Obra' ? "Ex: Tratorista com experiência" : "Ex: Serviço completo de Reflorestamento"} 
                            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20" 
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="description">O que está incluso?</label>
                        <textarea 
                            id="description" 
                            bind:value={form.description} 
                            rows="4"
                            placeholder="Descreva a sua experiência, quais máquinas você opera ou o que o seu pacote cobre..." 
                            class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20" 
                        ></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="location">Raio de Atendimento</label>
                        <div class="relative">
                            <MapPin class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                id="location" 
                                bind:value={form.location} 
                                class="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20" 
                            />
                        </div>
                    </div>
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="flex flex-1 flex-col">
                <p class="mb-2 text-sm text-gray-500">Etapa 3 de 3</p>
                <h2 class="mb-6 text-lg font-semibold text-gray-900">Como você cobra?</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="pricing_model">Formato de Cobrança</label>
                        <select id="pricing_model" bind:value={form.pricing_model} class="w-full rounded-lg border border-gray-300 p-3 bg-white text-sm outline-none focus:border-green-500">
                            <option value="Por Hora">Por Hora</option>
                            <option value="Por Hectare">Por Hectare</option>
                            <option value="Empreitada/Fixo">Empreitada / Fixo</option>
                            <option value="A Combinar">A Combinar (Avaliação prévia)</option>
                        </select>
                    </div>

                    {#if form.pricing_model !== 'A Combinar'}
                        <div class="pt-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="price">Valor Base (R$)</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">R$</span>
                                <input
                                    type="number"
                                    id="price"
                                    bind:value={form.price}
                                    placeholder="0,00"
                                    class="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <div class="mt-8 space-y-3">
            {#if currentStep === totalSteps - 1}
                <button
                    onclick={handleSubmit}
                    disabled={!canProceed() || loading}
                    class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Publicar Serviço'}
                </button>
                <button onclick={prevStep} disabled={loading} class="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Voltar e Revisar
                </button>
            {:else}
                <button
                    onclick={nextStep}
                    disabled={!canProceed()}
                    class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                    Próximo <ChevronRight class="h-5 w-5" />
                </button>
                <button onclick={prevStep} class="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-medium text-gray-700 hover:bg-gray-50">
                    {currentStep === 0 ? 'Cancelar' : 'Voltar'}
                </button>
            {/if}
        </div>
    </main>

    <BottomNav active="servicos" />
</div>