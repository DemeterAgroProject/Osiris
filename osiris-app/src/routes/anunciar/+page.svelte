<script>
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { requireUser } from '$lib/auth';
    import { ChevronRight, Tractor, Leaf } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import ProductImageUrlsEditor from '$lib/components/ProductImageUrlsEditor.svelte';
    import AppSteps from '$lib/components/ui/AppSteps.svelte';
    import { showToast } from '$lib/components/ui/toast.js';

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
    const totalSteps = 3;
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
        // pede o login antes de a pessoa preencher as etapas, não só no envio
        if (!(await requireUser('/anunciar'))) return;

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
        
        if (currentStep === 2) return form.price !== null && form.price > 0;
        
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
            goto(resolve('/inventario'));
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

            showToast('Anúncio publicado com sucesso!', 'success');
            await goto(resolve('/inventario'));

        } catch (error) {
            console.error("Erro ao salvar:", error);
            message = { text: formatSaveError(error), type: 'error' };
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex min-h-screen flex-col bg-surface-50-950 pb-20">
    <Header /> 

    <main class="flex flex-1 flex-col px-4 py-4 max-w-2xl mx-auto w-full">
        <h1 class="mb-6 text-center text-xl font-bold text-surface-950-50">Novo Anúncio</h1>

        {#if message.text}
            <div class="p-4 mb-4 rounded-container {message.type === 'error' ? 'preset-tonal-error' : 'preset-tonal-primary'}">
                {message.text}
            </div>
        {/if}

        <AppSteps
            bind:step={currentStep}
            labels={['Categoria', 'Detalhes', 'Preço']}
            label="Etapas do novo anúncio"
            class="mb-7"
        />

        {#if currentStep === 0}
            <div class="flex flex-1 flex-col">
                <h2 class="mb-4 text-base text-surface-600-400">O que você deseja anunciar?</h2>

                <div class="space-y-3">
                    <button
                        onclick={() => form.category = 'maquinario'}
                        class="flex w-full items-center gap-3 rounded-container border-2 p-4 text-left transition-all {form.category === 'maquinario' ? 'border-primary-500 preset-tonal-primary' : 'border-surface-200-800 bg-surface-50-950 hover:border-primary-300'}"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-container preset-tonal-primary text-primary-700">
                            <Tractor class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-surface-950-50">Maquinário Agrícola</h3>
                            <p class="text-xs text-surface-600-400">Tratores, colheitadeiras, plantadeiras</p>
                        </div>
                    </button>

                    <button
                        onclick={() => form.category = 'produto'}
                        class="flex w-full items-center gap-3 rounded-container border-2 p-4 text-left transition-all {form.category === 'produto' ? 'border-primary-500 preset-tonal-primary' : 'border-surface-200-800 bg-surface-50-950 hover:border-primary-300'}"
                    >
                        <div class="flex h-12 w-12 items-center justify-center rounded-container preset-tonal-warning">
                            <Leaf class="h-6 w-6" />
                        </div>
                        <div class="flex-1">
                            <h3 class="font-medium text-surface-950-50">Insumos ou Produtos</h3>
                            <p class="text-xs text-surface-600-400">Sementes, fertilizantes, mudas para reflorestamento</p>
                        </div>
                    </button>
                </div>
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
                            class="w-full rounded-container border border-surface-200-800 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" 
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-surface-700-300 mb-1" for="description">Descrição</label>
                        <textarea 
                            id="description" 
                            bind:value={form.description} 
                            rows="3"
                            placeholder="Adicione detalhes, estado de conservação, observações importantes..." 
                            class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" 
                        ></textarea>
                    </div>

                    {#if form.category === 'maquinario'}
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="type">Tipo</label>
                                <select id="type" bind:value={form.type_id} class="w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione</option>
                                    {#each types as type (type.id)}
                                        <option value={type.id}>{type.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="brand">Marca</label>
                                <select id="brand" bind:value={form.brand_id} class="w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione</option>
                                    {#each brands as brand (brand.id)}
                                        <option value={brand.id}>{brand.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-surface-700-300 mb-1" for="model">Modelo Exato</label>
                            <input type="text" id="model" bind:value={form.model} placeholder="Ex: 6100J" class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                        </div>

						<div>
							<label class="block text-sm font-medium text-surface-700-300 mb-1" for="serial_number">Número de Série / Chassi </label>
							<input type="text" id="serial_number" bind:value={form.serial_number} placeholder="Ex: 123456789ABC" class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
						</div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="year">Ano de Fab.</label>
                                <input type="number" id="year" bind:value={form.manufacture_year} placeholder="Ex: 2018" min="1950" class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="horimeter">Horímetro</label>
                                <input type="number" id="horimeter" bind:value={form.current_horimeter} placeholder="Em horas" class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                            </div>
                        </div>

                    {:else if form.category === 'produto'}
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-surface-700-300 mb-1" for="prod_category">Categoria do Insumo</label>
                                <select id="prod_category" bind:value={form.product_category} class="w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
                                    <option value="" disabled>Selecione a categoria...</option>
                                    <option value="Sementes">Sementes</option>
                                    <option value="Fertilizantes">Fertilizantes</option>
                                    <option value="Mudas">Mudas </option>
                                    <option value="Defensivos">Defensivos Agrícolas</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-surface-700-300 mb-1" for="qty">Quantidade</label>
                                    <input type="number" id="qty" bind:value={form.quantity} min="1" class="w-full rounded-container border border-surface-200-800 p-3 text-sm outline-none focus:border-primary-500" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-surface-700-300 mb-1" for="unit">Unidade</label>
                                    <select id="unit" bind:value={form.stock_unit} class="w-full rounded-container border border-surface-200-800 p-3 bg-surface-50-950 text-sm outline-none focus:border-primary-500">
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
                <h2 class="mb-6 text-lg font-semibold text-surface-950-50">Qual é o valor cobrado?</h2>

                <div>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-600-400">R$</span>
                        <input
                            type="number"
                            bind:value={form.price}
                            placeholder="500"
                            class="w-full rounded-container border border-surface-200-800 py-3 pl-12 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <p class="mt-2 text-xs text-surface-600-400">Valor por hora de trabalho (se for aluguel) ou venda.</p>
                </div>

                {#if form.price && form.price > 0}
                    <div class="mt-6 rounded-container preset-tonal-primary p-4 border border-primary-500">
                        <p class="text-sm text-surface-600-400">Seu anúncio será publicado por:</p>
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
                    {loading ? 'Publicando...' : 'Publicar anúncio'}
                </button>
                <button onclick={prevStep} disabled={loading} class="w-full rounded-container border border-surface-200-800 bg-surface-50-950 py-3.5 font-medium text-surface-700-300 hover:preset-tonal disabled:opacity-50">
                    Voltar e revisar
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
