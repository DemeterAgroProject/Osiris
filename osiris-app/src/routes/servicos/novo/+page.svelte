<script>
    import { Steps, ToggleGroup } from '@skeletonlabs/skeleton-svelte';
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

<div class="flex min-h-screen flex-col bg-surface-50-950 pb-20">
    <Header />

    <main class="flex flex-1 flex-col px-4 py-4 max-w-2xl mx-auto w-full">
        <h1 class="mb-6 text-center text-xl font-bold text-surface-950-50">Oferecer Serviço</h1>

        {#if message.text}
            <div class="p-4 mb-4 rounded-container {message.type === 'error' ? 'preset-tonal-error' : 'preset-tonal-primary'}">
                {message.text}
            </div>
        {/if}

        <Steps
            step={currentStep}
            count={totalSteps}
            linear
            onStepChange={(details) => {
                if (details.step <= currentStep) currentStep = details.step;
            }}
            class="mb-7"
        >
            <Steps.List class="flex items-start" aria-label="Etapas do novo serviço">
                {#each ['Tipo', 'Detalhes', 'Cobrança'] as label, index (label)}
                    <Steps.Item {index} class="flex flex-1 items-start">
                        <Steps.Trigger disabled={index > currentStep} class="group flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                            <Steps.Indicator class="flex size-8 items-center justify-center rounded-full border border-surface-300-700 bg-surface-50-950 text-xs font-bold text-surface-700-300 data-[complete]:border-primary-500 data-[complete]:preset-filled-primary-500 data-[current]:border-primary-500 data-[current]:preset-filled-primary-500">
                                {index + 1}
                            </Steps.Indicator>
                            <span class="text-[11px] font-medium text-surface-700-300">{label}</span>
                        </Steps.Trigger>
                        {#if index < totalSteps - 1}
                            <Steps.Separator class="mt-4 h-px flex-1 bg-surface-300-700 data-[complete]:bg-primary-500" />
                        {/if}
                    </Steps.Item>
                {/each}
            </Steps.List>
        </Steps>

        {#if currentStep === 0}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-4 text-base text-surface-700-300">Como você vai atuar?</h2>

                <ToggleGroup
                    value={form.service_type ? [form.service_type] : []}
                    deselectable={false}
                    onValueChange={(details) => (form.service_type = details.value[0] ?? form.service_type)}
                    class="space-y-3"
                >
                    <ToggleGroup.Item
                        value="Mão de Obra"
                        class="flex w-full items-center gap-3 rounded-container border-2 border-surface-200-800 bg-surface-50-950 p-4 text-left transition-colors data-[state=on]:border-primary-500 data-[state=on]:preset-tonal-primary"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-container preset-tonal-primary">
                            <Users class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-surface-950-50">Mão de Obra</h3>
                            <p class="text-xs text-surface-700-300">Apenas o operador ou trabalhador (ex: tratorista, capataz)</p>
                        </div>
                    </ToggleGroup.Item>

                    <ToggleGroup.Item
                        value="Pacote Completo"
                        class="flex w-full items-center gap-3 rounded-container border-2 border-surface-200-800 bg-surface-50-950 p-4 text-left transition-colors data-[state=on]:border-primary-500 data-[state=on]:preset-tonal-primary"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-container preset-tonal-secondary">
                            <Briefcase class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-surface-950-50">Pacote Completo</h3>
                            <p class="text-xs text-surface-700-300">Serviço com maquinário/insumos inclusos (ex: plantio de eucalipto)</p>
                        </div>
                    </ToggleGroup.Item>
                </ToggleGroup>
            </div>

        {:else if currentStep === 1}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-4 text-lg font-semibold text-surface-950-50">Detalhes do Serviço</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="title">Título do Serviço</label>
                        <input
                            type="text"
                            id="title"
                            bind:value={form.title}
                            placeholder={form.service_type === 'Mão de Obra' ? "Ex: Tratorista com experiência" : "Ex: Serviço completo de Reflorestamento"}
                            class="input w-full rounded-container border border-surface-200-800 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="description">O que está incluso?</label>
                        <textarea
                            id="description"
                            bind:value={form.description}
                            rows="4"
                            placeholder="Descreva a sua experiência, quais máquinas você opera ou o que o seu pacote cobre..."
                            class="textarea w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        ></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="location">Raio de Atendimento</label>
                        <div class="relative">
                            <MapPin class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-700-300" />
                            <input
                                type="text"
                                id="location"
                                bind:value={form.location}
                                class="input w-full rounded-container border border-surface-200-800 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                    </div>
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-6 text-lg font-semibold text-surface-950-50">Como você cobra?</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="pricing_model">Formato de Cobrança</label>
                        <select id="pricing_model" bind:value={form.pricing_model} class="select w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                            <option value="Por Hora">Por Hora</option>
                            <option value="Por Hectare">Por Hectare</option>
                            <option value="Empreitada/Fixo">Empreitada / Fixo</option>
                            <option value="A Combinar">A Combinar (Avaliação prévia)</option>
                        </select>
                    </div>

                    {#if form.pricing_model !== 'A Combinar'}
                        <div class="pt-2">
                            <label class="block text-sm font-medium text-surface-700-300 mb-1" for="price">Valor Base (R$)</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-700-300">R$</span>
                                <input
                                    type="number"
                                    id="price"
                                    bind:value={form.price}
                                    placeholder="0,00"
                                    class="input w-full rounded-container border border-surface-200-800 py-3 pl-12 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                    class="flex w-full items-center justify-center gap-2 rounded-container preset-filled-primary-500 py-3.5 font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Publicar Serviço'}
                </button>
                <button onclick={prevStep} disabled={loading} class="w-full rounded-container border border-surface-200-800 bg-surface-50-950 py-3.5 font-medium text-surface-700-300 hover:preset-tonal disabled:opacity-50">
                    Voltar e Revisar
                </button>
            {:else}
                <button
                    onclick={nextStep}
                    disabled={!canProceed()}
                    class="flex w-full items-center justify-center gap-2 rounded-container preset-filled-primary-500 py-3.5 font-medium transition-colors disabled:opacity-50"
                >
                    Próximo <ChevronRight class="h-5 w-5" />
                </button>
                <button onclick={prevStep} class="w-full rounded-container border border-surface-200-800 bg-surface-50-950 py-3.5 font-medium text-surface-700-300 hover:preset-tonal">
                    {currentStep === 0 ? 'Cancelar' : 'Voltar'}
                </button>
            {/if}
        </div>
    </main>

    <BottomNav active="servicos" />
</div>
