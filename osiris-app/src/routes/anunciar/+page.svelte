<script>
    import { Steps, ToggleGroup } from '@skeletonlabs/skeleton-svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { ChevronRight, ChevronLeft, Tractor, MapPin, LeafIcon } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import ProductImageUrlsEditor from '$lib/components/ProductImageUrlsEditor.svelte';

    function createEmptyImageRow(isCover = false) {
        return { id: null, url: '', is_cover: isCover, removed: false };
    }

    function isValidImageUrl(value) {
        const trimmed = value?.trim();
        if (!trimmed) return false;
        try {
            const parsed = new URL(trimmed);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function collectImageUrls(images) {
        return (images ?? [])
            .filter((img) => !img.removed && isValidImageUrl(img.url))
            .map((img) => img.url.trim());
    }

    async function insertProductImages(productId, urls) {
        const cleaned = (urls ?? []).map((url) => String(url).trim()).filter(isValidImageUrl);
        if (!cleaned.length) return null;

        const rows = cleaned.map((url, index) => ({
            product_id: productId,
            url,
            is_cover: index === 0
        }));

        const { error } = await supabase.from('product_images').insert(rows);
        return error;
    }

    // Step management
    let currentStep = $state(0);
    const totalSteps = 4;
    let loading = $state(false);
    let message = $state({ text: '', type: '' });

    // Dados carregados do Banco
    let brands = $state([]);
    let types = $state([]);

    // Form state unificado
    let form = $state({
            category: '', // Usado para o fluxo da tela (maquinario vs produto)
            product_category: '', // A categoria real do insumo que vai pro banco
            name: '',
            description: '',
            price: null,
            location: 'Alegrete, RS',

            // Campos específicos de Maquinário
            brand_id: '',
            type_id: '',
            model: '',
			serial_number: '',
            manufacture_year: '',
            current_horimeter: '',

            // Campos específicos de Produto/Insumo
            quantity: 1,
            stock_unit: 'Sacas',

            // Imagens (URLs) — product_images
            images: [createEmptyImageRow(true)]
    });

    onMount(async () => {
        const [{ data: bData }, { data: tData }] = await Promise.all([
            supabase.from('brands').select('*').order('name'),
            supabase.from('machinery_types').select('*').order('name')
        ]);
        if (bData) brands = bData;
        if (tData) types = tData;
    });

    // Validação de cada etapa para liberar o botão "Próximo"
    function canProceed() {
        if (currentStep === 0) return form.category !== '';

        if (currentStep === 1) {
            if (form.category === 'maquinario') {
                return form.name.trim().length > 0 && form.brand_id !== '' && form.type_id !== '' && form.model.trim().length > 0 && form.manufacture_year > 0 && form.current_horimeter !== '';
            }
            // Se for produto, exige nome, categoria selecionada e quantidade
            return form.name.trim().length > 0 && form.product_category !== '' && form.quantity > 0;
        }

        if (currentStep === 2) return true;
        if (currentStep === 3) return form.price !== null && form.price > 0;

        return true;
    }

    function nextStep() {
        if (currentStep < totalSteps - 1 && canProceed()) {
            currentStep++;
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
        } else {
            goto('/inventario');
        }
    }

    function formatPrice(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function formatSaveError(error) {
        if (error?.code === '23505' && String(error?.message ?? '').includes('serial_number')) {
            return 'Este número de série já está cadastrado. Informe outro ou deixe o campo em branco.';
        }
        if (
            (error?.code === '42501' || error?.status === 403) &&
            String(error?.message ?? '').includes('product_images')
        ) {
            return 'Não foi possível salvar as imagens. Execute o SQL em supabase/product_images_rls.sql no Supabase (SQL Editor).';
        }
        return 'Ocorreu um erro ao publicar o anúncio. Tente novamente.';
    }

    async function rollbackMachineryAd(productId) {
        await supabase.from('agricultural_machinery').delete().eq('product_id', productId);
        await supabase.from('products').delete().eq('id', productId);
    }

    async function rollbackProductAd(productId) {
        await supabase.from('products').delete().eq('id', productId);
    }

    async function handleSubmit() {
        loading = true;
        message = { text: '', type: '' };

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            message = { text: 'Você precisa estar logado para anunciar.', type: 'error' };
            loading = false;
            return;
        }

        try {
            if (form.category === 'maquinario') {
                // 1. Cria o Produto base (onde ficam as informações gerais e a descrição)
                const { data: baseProduct, error: productError } = await supabase
                    .from('products')
                    .insert({
                        owner_id: user.id,
                        name: form.name,
                        description: form.description,
                        price: form.price,
                        category: 'Maquinário',
                        quantity: 1,
                        stock_unit: 'Unidade',
                        status: 'ativo'
                    })
                    .select()
                    .single();

                if (productError) throw productError;

                // 2. Cria os detalhes da Máquina atrelados ao Produto base
                const { error: machineryError } = await supabase
                    .from('agricultural_machinery')
                    .insert({
                        product_id: baseProduct.id,
                        brand_id: form.brand_id,
                        type_id: form.type_id,
                        model: form.model,
                        serial_number: form.serial_number?.trim() || null,
                        manufacture_year: parseInt(form.manufacture_year),
                        current_horimeter: parseFloat(form.current_horimeter)
                    });

                if (machineryError) {
                    await supabase.from('products').delete().eq('id', baseProduct.id);
                    throw machineryError;
                }

                const imageUrls = collectImageUrls(form.images);
                const imageError = await insertProductImages(baseProduct.id, imageUrls);
                if (imageError) {
                    await rollbackMachineryAd(baseProduct.id);
                    throw imageError;
                }

            } else if (form.category === 'produto') {
                const { data: baseProduct, error: productError } = await supabase
                    .from('products')
                    .insert({
                        owner_id: user.id,
                        name: form.name,
                        description: form.description,
                        price: form.price,
                        category: form.product_category,
                        quantity: form.quantity,
                        stock_unit: form.stock_unit,
                        status: 'ativo'
                    })
                    .select('id')
                    .single();

                if (productError) throw productError;

                const imageUrls = collectImageUrls(form.images);
                const imageError = await insertProductImages(baseProduct.id, imageUrls);
                if (imageError) {
                    await rollbackProductAd(baseProduct.id);
                    throw imageError;
                }
            }

            message = { text: 'Anúncio publicado com sucesso no Osíris!', type: 'success' };
            setTimeout(() => goto('/inventario'), 2000);

        } catch (error) {
            console.error("Erro ao salvar:", error);
            message = { text: formatSaveError(error), type: 'error' };
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex min-h-screen flex-col bg-surface-50-950 pb-20 lg:pb-0">
    <Header />

    <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <h1 class="mb-6 text-center text-xl font-bold text-surface-950-50">Novo Anúncio</h1>

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
            <Steps.List class="flex items-start" aria-label="Etapas do novo anúncio">
                {#each ['Tipo', 'Detalhes', 'Localização', 'Valor'] as label, index (label)}
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
                <h2 class="mb-4 text-base text-surface-700-300">O que você deseja anunciar?</h2>

                <ToggleGroup
                    value={form.category ? [form.category] : []}
                    deselectable={false}
                    onValueChange={(details) => (form.category = details.value[0] ?? form.category)}
                    class="grid! w-full! grid-cols-1 gap-3 overflow-visible! rounded-none! border-0! bg-transparent! sm:grid-cols-2"
                >
                    <ToggleGroup.Item
                        value="maquinario"
                        class="flex! min-h-28 w-full! min-w-0 aspect-auto! items-center justify-start! gap-4 rounded-container border-2! border-surface-200-800 bg-surface-50-950 p-4 text-left transition-colors data-[state=on]:border-primary-500! data-[state=on]:preset-tonal-primary"
                    >
                        <div class="flex size-12 shrink-0 items-center justify-center rounded-container preset-tonal-primary text-primary-700">
                            <Tractor class="size-6" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="text-sm font-semibold leading-5 text-surface-950-50">Maquinário Agrícola</h3>
                            <p class="mt-1 text-xs leading-5 text-surface-700-300">Tratores, colheitadeiras e plantadeiras</p>
                        </div>
                    </ToggleGroup.Item>

                    <ToggleGroup.Item
                        value="produto"
                        class="flex! min-h-28 w-full! min-w-0 aspect-auto! items-center justify-start! gap-4 rounded-container border-2! border-surface-200-800 bg-surface-50-950 p-4 text-left transition-colors data-[state=on]:border-primary-500! data-[state=on]:preset-tonal-primary"
                    >
                        <div class="flex size-12 shrink-0 items-center justify-center rounded-container preset-tonal-primary text-primary-700">
                            <LeafIcon class="size-6" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="text-sm font-semibold leading-5 text-surface-950-50">Insumos ou Produtos</h3>
                            <p class="mt-1 text-xs leading-5 text-surface-700-300">Sementes, fertilizantes e mudas para reflorestamento</p>
                        </div>
                    </ToggleGroup.Item>
                </ToggleGroup>
            </div>

        {:else if currentStep === 1}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-4 text-lg font-semibold text-surface-950-50">
                    Detalhes do {form.category === 'maquinario' ? 'Maquinário' : 'Produto'}
                </h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="name">Título do Anúncio</label>
                        <input
                            type="text"
                            id="name"
                            bind:value={form.name}
                            placeholder={form.category === 'maquinario' ? "Ex: Trator JD 6100J" : "Ex: Sementes de Soja Branca"}
                            class="input w-full rounded-container border border-surface-200-800 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="description">Descrição</label>
                        <textarea
                            id="description"
                            bind:value={form.description}
                            rows="3"
                            placeholder="Adicione detalhes, estado de conservação, observações importantes..."
                            class="textarea w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        ></textarea>
                    </div>

                    {#if form.category === 'maquinario'}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="type">Tipo</label>
                                <select id="type" bind:value={form.type_id} class="select w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione</option>
                                    {#each types as type}
                                        <option value={type.id}>{type.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="brand">Marca</label>
                                <select id="brand" bind:value={form.brand_id} class="select w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione</option>
                                    {#each brands as brand}
                                        <option value={brand.id}>{brand.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-surface-700-300 mb-1" for="model">Modelo Exato</label>
                            <input type="text" id="model" bind:value={form.model} placeholder="Ex: 6100J" class="input w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                        </div>

						<div>
							<label class="block text-sm font-medium text-surface-700-300 mb-1" for="serial_number">Número de Série / Chassi </label>
							<input type="text" id="serial_number" bind:value={form.serial_number} placeholder="Ex: 123456789ABC" class="input w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="year">Ano de Fab.</label>
                                <input type="number" id="year" bind:value={form.manufacture_year} placeholder="Ex: 2018" min="1950" class="input w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="horimeter">Horímetro</label>
                                <input type="number" id="horimeter" bind:value={form.current_horimeter} placeholder="Em horas" class="input w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                            </div>
                        </div>

                    {:else if form.category === 'produto'}
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="prod_category">Categoria do Insumo</label>
                                <select id="prod_category" bind:value={form.product_category} class="select w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione a categoria...</option>
                                    <option value="Sementes">Sementes</option>
                                    <option value="Fertilizantes">Fertilizantes</option>
                                    <option value="Mudas">Mudas </option>
                                    <option value="Defensivos">Defensivos Agrícolas</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label class="block text-sm font-medium text-surface-700-300 mb-1" for="qty">Quantidade</label>
                                    <input type="number" id="qty" bind:value={form.quantity} min="1" class="input w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-surface-700-300 mb-1" for="unit">Unidade</label>
                                    <select id="unit" bind:value={form.stock_unit} class="select w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                        <option value="Sacas">Sacas</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Toneladas">Toneladas</option>
                                        <option value="Litros">Litros</option>
                                        <option value="Unidades">Unidades</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <ProductImageUrlsEditor bind:images={form.images} />
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-4 text-base text-surface-700-300">Localização</h2>
                <div class="relative flex-1 overflow-hidden rounded-container border border-surface-200-800 bg-surface-100-900 min-h-[300px]">
                    <div class="absolute inset-0 flex items-center justify-center bg-surface-100-900">
                        <svg class="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {#each Array(10) as _, i}
                                <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="currentColor" stroke-width="0.5" />
                                <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="currentColor" stroke-width="0.5" />
                            {/each}
                        </svg>
                    </div>
                    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                        <div class="relative">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full preset-filled-error-500 ">
                                <MapPin class="h-5 w-5" />
                            </div>
                            <div class="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 preset-filled-error-500"></div>
                        </div>
                    </div>
                    <div class="absolute bottom-4 left-4 right-4">
                        <div class="rounded-container bg-surface-50-950/90 px-4 py-2  backdrop-blur-sm border border-surface-200-800">
                            <p class="text-sm font-medium text-surface-950-50">{form.location}</p>
                            <p class="text-xs text-surface-700-300">Alegrete e Região</p>
                        </div>
                    </div>
                </div>
            </div>

        {:else if currentStep === 3}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-6 text-lg font-semibold text-surface-950-50">Qual é o valor cobrado?</h2>

                <div>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-700-300">R$</span>
                        <input
                            type="number"
                            bind:value={form.price}
                            placeholder="500"
                            class="input w-full rounded-container border border-surface-200-800 py-3 pl-12 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <p class="mt-2 text-xs text-surface-700-300">Valor por hora de trabalho (se for aluguel) ou venda.</p>
                </div>

                {#if form.price && form.price > 0}
                    <div class="mt-6 rounded-container preset-tonal-primary p-4 border border-primary-500">
                        <p class="text-sm text-surface-700-300">Seu anúncio será publicado por:</p>
                        <p class="mt-1 text-2xl font-bold text-primary-700">{formatPrice(form.price)}</p>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="mt-8 space-y-3">
            {#if currentStep === totalSteps - 1}
                <button
                    onclick={handleSubmit}
                    disabled={!canProceed() || loading}
                    class="flex w-full items-center justify-center gap-2 rounded-container preset-filled-primary-500 py-3.5 font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Salvando no Banco...' : 'Publicar Anúncio'}
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

    <BottomNav active="anunciar" />
</div>
