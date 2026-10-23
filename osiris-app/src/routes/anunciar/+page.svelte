<script>
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { requireUser } from '$lib/auth';
    import { track, trackError } from '$lib/telemetry';
    import { ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, Leaf, Tag, Timer, Tractor } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import ProductImageUrlsEditor from '$lib/components/ProductImageUrlsEditor.svelte';
    import MunicipioPicker from '$lib/components/MunicipioPicker.svelte';
    import { fetchMyMunicipio } from '$lib/municipios';
    import { DELIVERY_LABEL, listingPriceLabel, stockUnitLabel } from '$lib/pricing';

    const RENTAL_HINT = { hora: 'por hora de uso', dia: 'por dia', hectare: 'por hectare trabalhado' };

    // cultivar e safra só fazem sentido para sementes, mudas e grãos
    const SEED_CATEGORIES = ['Sementes', 'Mudas', 'Grãos'];
    const harvestInvalid = $derived(form.harvest.trim() !== '' && !/^\d{4}(\/\d{2})?$/.test(form.harvest.trim()));
    import AppSteps from '$lib/components/ui/AppSteps.svelte';
    import { showToast } from '$lib/components/ui/toast.js';

    const CATEGORY_OPTIONS = [
        { value: 'maquinario', label: 'Máquina agrícola', hint: 'Tratores, colheitadeiras, plantadeiras', icon: Tractor, tone: 'preset-tonal-primary' },
        { value: 'produto', label: 'Insumos ou produtos', hint: 'Sementes, fertilizantes, mudas', icon: Leaf, tone: 'preset-tonal-tertiary' }
    ];

    // campos do formulário: altos e com texto grande, fáceis de tocar no celular
    const labelClass = 'mb-1.5 block text-sm font-semibold text-surface-950-50';
    const fieldClass = 'input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-4 text-base outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
    const selectClass = 'select h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

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
            offer_type: 'aluguel', // venda | aluguel
            rental_unit: 'hora', // aluguel: preço por hora, dia ou hectare
            operator_included: false,
            condition: '', // nova | seminova | usada
            power_hp: '',
            traction: '', // 4x2 | 4x4 | esteira (opcional)

            // Campos específicos de Produto/Insumo
            quantity: 1,
            stock_unit: 'Sacas',
            brand_name: '', // marca ou fabricante (opcional)
            min_order: '', // pedido mínimo na mesma unidade (opcional)
            cultivar: '', // sementes, mudas e grãos (opcional)
            harvest: '', // safra "2025/26" (opcional)

            // Máquina e produto
            delivery: '', // retirada | entrega | a_combinar

            // Imagens (URLs) — product_images
            images: [createEmptyImageRow(true)],

            // Cidade onde está (município do IBGE); vem preenchida com a cidade do perfil
            municipio: null
    });

    // id de cada abertura do formulário: separa desistência e publicação na mesma sessão
    const tentativa = crypto.randomUUID().slice(0, 8);

    onMount(async () => {
        // pede o login antes de a pessoa preencher as etapas, não só no envio
        if (!(await requireUser('/anunciar'))) return;
        track('anuncio_iniciado', { tentativa });

        fetchMyMunicipio().then((municipio) => {
            if (municipio && !form.municipio) form.municipio = municipio;
        });

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
            if (!form.municipio) return false;
            if (form.category === 'maquinario') {
                return form.name.trim().length > 0 && form.brand_id !== '' && form.type_id !== '' && form.model.trim().length > 0 && form.manufacture_year > 0 && form.current_horimeter !== '' && form.condition !== '';
            }
            // Se for produto, exige nome, categoria selecionada e quantidade
            if (harvestInvalid) return false;
            return form.name.trim().length > 0 && form.product_category !== '' && form.quantity > 0;
        }
        
        if (currentStep === 2) return form.price !== null && form.price > 0;
        
        return true;
    }

    function nextStep() {
        if (currentStep < totalSteps - 1 && canProceed()) {
            currentStep++;
            track('anuncio_etapa', { tentativa, etapa: currentStep, categoria: form.category });
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
        } else {
            goto(resolve('/inventario'));
        }
    }

    function formatSaveError(error) {
        if (error?.code === '23505' && String(error?.message ?? '').includes('serial_number')) {
            return 'Este número de série já está cadastrado. Informe outro ou deixe o campo em branco.';
        }
        if (
            (error?.code === '42501' || error?.status === 403) &&
            String(error?.message ?? '').includes('product_images')
        ) {
            return 'Não foi possível salvar as imagens. Tente novamente.';
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
                        status: 'ativo',
                        municipio_id: form.municipio?.codigo_ibge ?? null,
                        delivery: form.delivery || null
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
                        current_horimeter: parseFloat(form.current_horimeter),
                        offer_type: form.offer_type,
                        rental_unit: form.rental_unit,
                        operator_included: form.offer_type === 'aluguel' && form.operator_included,
                        condition: form.condition,
                        power_hp: Number(form.power_hp) > 0 ? Math.round(Number(form.power_hp)) : null,
                        traction: form.traction || null
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
                        brand_name: form.brand_name.trim() || null,
                        min_order: Number(form.min_order) > 0 ? Number(form.min_order) : null,
                        cultivar: SEED_CATEGORIES.includes(form.product_category) ? form.cultivar.trim() || null : null,
                        harvest: SEED_CATEGORIES.includes(form.product_category) ? form.harvest.trim() || null : null,
                        status: 'ativo',
                        municipio_id: form.municipio?.codigo_ibge ?? null,
                        delivery: form.delivery || null
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

            track('anuncio_publicado', {
                tentativa,
                categoria: form.category,
                negocio: form.category === 'maquinario' ? form.offer_type : undefined,
                cobranca: form.category === 'maquinario' && form.offer_type === 'aluguel' ? form.rental_unit : undefined
            });
            showToast('Anúncio publicado com sucesso!', 'success');
            await goto(resolve('/inventario'));

        } catch (error) {
            trackError('anuncio_falhou', error, { tentativa, categoria: form.category, etapa: currentStep });
            message = { text: formatSaveError(error), type: 'error' };
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
	<title>Novo anúncio — Osiris</title>
</svelte:head>

<div class="flex min-h-screen flex-col pb-24">
    <Header title="Novo anúncio" backHref="/inventario" />

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <div class="mb-5 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
            <AppSteps
                bind:step={currentStep}
                labels={['Categoria', 'Detalhes', 'Preço']}
                label="Etapas do novo anúncio"
            />
        </div>

        {#if message.text}
            <div class="mb-4 flex items-start gap-2 rounded-container p-4 text-sm font-medium {message.type === 'error' ? 'preset-tonal-error' : 'preset-tonal-success'}" role="status">
                <CircleAlert class="h-5 w-5 shrink-0" />
                {message.text}
            </div>
        {/if}

        {#if currentStep === 0}
            <div class="flex flex-1 flex-col">
                <h1 class="preset-typo-headline">O que você deseja anunciar?</h1>
                <p class="mt-1 preset-typo-subtitle">Toque em uma das opções.</p>

                <div class="mt-5 space-y-3">
                    {#each CATEGORY_OPTIONS as option (option.value)}
                        {@const selected = form.category === option.value}
                        <button
                            type="button"
                            onclick={() => form.category = option.value}
                            aria-pressed={selected}
                            class="flex w-full items-center gap-4 rounded-container border-2 p-4 text-left shadow-sm transition-all {selected ? 'border-primary-500 preset-tonal-primary' : 'border-surface-200-800 bg-surface-50-950 hover:border-primary-500'}"
                        >
                            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-container {option.tone}">
                                <option.icon class="h-7 w-7" />
                            </span>
                            <span class="min-w-0 flex-1">
                                <span class="block text-lg font-bold text-surface-950-50">{option.label}</span>
                                <span class="block text-sm text-surface-800-200">{option.hint}</span>
                            </span>
                            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 {selected ? 'border-primary-500 preset-filled-primary-500' : 'border-surface-300-700'}">
                                {#if selected}<Check class="h-4 w-4" />{/if}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>

        {:else if currentStep === 1}
            <div class="flex flex-1 flex-col">
                <h1 class="preset-typo-headline">
                    Detalhes {form.category === 'maquinario' ? 'da máquina' : 'do produto'}
                </h1>
                <p class="mt-1 preset-typo-subtitle">Quanto mais completo, mais fácil de negociar.</p>

                <div class="mt-5 space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <div>
                        <label class={labelClass} for="name">Título do anúncio</label>
                        <input
                            type="text"
                            id="name"
                            bind:value={form.name}
                            placeholder={form.category === 'maquinario' ? "Ex: Trator JD 6100J" : "Ex: Sementes de soja branca"}
                            class={fieldClass}
                        />
                    </div>

                    <div>
                        <label class={labelClass} for="description">Descrição</label>
                        <textarea
                            id="description"
                            bind:value={form.description}
                            rows="4"
                            placeholder="Adicione detalhes, estado de conservação, observações importantes..."
                            class="{fieldClass} h-auto py-3"
                        ></textarea>
                    </div>

                    {#if form.category === 'maquinario'}
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="type">Tipo</label>
                                <select id="type" bind:value={form.type_id} class={selectClass}>
                                    <option value="" disabled>Selecione</option>
                                    {#each types as type (type.id)}
                                        <option value={type.id}>{type.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class={labelClass} for="brand">Marca</label>
                                <select id="brand" bind:value={form.brand_id} class={selectClass}>
                                    <option value="" disabled>Selecione</option>
                                    {#each brands as brand (brand.id)}
                                        <option value={brand.id}>{brand.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class={labelClass} for="model">Modelo</label>
                            <input type="text" id="model" bind:value={form.model} placeholder="Ex: 6100J" class={fieldClass} />
                        </div>

                        <div>
                            <label class={labelClass} for="serial_number">Número de série / chassi <span class="font-normal text-surface-700-300">(opcional)</span></label>
                            <input type="text" id="serial_number" bind:value={form.serial_number} placeholder="Ex: 123456789ABC" class={fieldClass} />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="condition">Condição</label>
                                <select id="condition" bind:value={form.condition} class={selectClass}>
                                    <option value="" disabled>Selecione</option>
                                    <option value="nova">Nova</option>
                                    <option value="seminova">Seminova</option>
                                    <option value="usada">Usada</option>
                                </select>
                            </div>
                            <div>
                                <label class={labelClass} for="power">Potência (cv) <span class="font-normal text-surface-700-300">(opcional)</span></label>
                                <input type="number" inputmode="numeric" id="power" bind:value={form.power_hp} placeholder="Ex: 110" min="1" class={fieldClass} />
                            </div>
                        </div>

                        <div>
                            <label class={labelClass} for="traction">Tração <span class="font-normal text-surface-700-300">(opcional)</span></label>
                            <select id="traction" bind:value={form.traction} class={selectClass}>
                                <option value="">Não informar</option>
                                <option value="4x2">4x2</option>
                                <option value="4x4">4x4</option>
                                <option value="esteira">Esteira</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="year">Ano de fabricação</label>
                                <input type="number" inputmode="numeric" id="year" bind:value={form.manufacture_year} placeholder="Ex: 2018" min="1950" class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="horimeter">Horímetro (horas)</label>
                                <input type="number" inputmode="numeric" id="horimeter" bind:value={form.current_horimeter} placeholder="Ex: 2500" class={fieldClass} />
                            </div>
                        </div>

                    {:else if form.category === 'produto'}
                        <div>
                            <label class={labelClass} for="prod_category">Categoria do insumo</label>
                            <select id="prod_category" bind:value={form.product_category} class={selectClass}>
                                <option value="" disabled>Selecione a categoria...</option>
                                <option value="Sementes">Sementes</option>
                                <option value="Fertilizantes">Fertilizantes</option>
                                <option value="Mudas">Mudas </option>
                                <option value="Defensivos">Defensivos Agrícolas</option>
                                <option value="Corretivos">Corretivos (calcário, gesso)</option>
                                <option value="Grãos">Grãos</option>
                                <option value="Nutrição animal">Nutrição animal</option>
                                <option value="Peças">Peças e acessórios</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="qty">Quantidade</label>
                                <input type="number" inputmode="numeric" id="qty" bind:value={form.quantity} min="1" class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="unit">Unidade</label>
                                <select id="unit" bind:value={form.stock_unit} class={selectClass}>
                                    <option value="Sacas">Sacas</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Toneladas">Toneladas</option>
                                    <option value="Litros">Litros</option>
                                    <option value="Unidades">Unidades</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="brand_name">Marca ou fabricante <span class="font-normal text-surface-700-300">(opcional)</span></label>
                                <input type="text" id="brand_name" bind:value={form.brand_name} maxlength="80" placeholder="Ex: Brasmax" class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="min_order">Pedido mínimo <span class="font-normal text-surface-700-300">(opcional)</span></label>
                                <input type="number" inputmode="numeric" id="min_order" bind:value={form.min_order} min="1" placeholder={`Em ${stockUnitLabel(form.stock_unit)}`} class={fieldClass} />
                            </div>
                        </div>
                        {#if SEED_CATEGORIES.includes(form.product_category)}
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class={labelClass} for="cultivar">Cultivar <span class="font-normal text-surface-700-300">(opcional)</span></label>
                                    <input type="text" id="cultivar" bind:value={form.cultivar} maxlength="80" placeholder="Ex: BMX Zeus IPRO" class={fieldClass} />
                                </div>
                                <div>
                                    <label class={labelClass} for="harvest">Safra <span class="font-normal text-surface-700-300">(opcional)</span></label>
                                    <input type="text" id="harvest" bind:value={form.harvest} maxlength="7" placeholder="Ex: 2025/26" aria-invalid={harvestInvalid ? 'true' : undefined} class={fieldClass} />
                                    {#if harvestInvalid}
                                        <p class="mt-1 text-xs text-error-600">Use o formato 2025/26 ou 2026.</p>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>

                <div class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <MunicipioPicker
                        id="anuncio-municipio"
                        label={form.category === 'maquinario' ? 'Cidade onde a máquina está' : 'Cidade onde o produto está'}
                        hint="Só a cidade aparece no anúncio. Endereço e retirada você combina na negociação."
                        required
                        bind:value={form.municipio}
                    />
                </div>

                <div class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <ProductImageUrlsEditor bind:images={form.images} />
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="flex flex-1 flex-col">
                <h1 class="preset-typo-headline">Qual é o valor cobrado?</h1>
                <p class="mt-1 preset-typo-subtitle">Você poderá mudar o preço depois.</p>

                {#if form.category === 'maquinario'}
                    <fieldset class="mt-5">
                        <legend class="mb-2 text-sm font-semibold text-surface-950-50">Tipo de negócio</legend>
                        <div class="grid grid-cols-2 gap-3">
                            {#each [{ value: 'aluguel', label: 'Aluguel', hint: 'preço por hora, dia ou hectare', icon: Timer }, { value: 'venda', label: 'Venda', hint: 'preço da máquina', icon: Tag }] as option (option.value)}
                                {@const selected = form.offer_type === option.value}
                                <label
                                    class="flex cursor-pointer flex-col gap-1 rounded-container border-2 p-4 shadow-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 {selected
                                        ? 'border-primary-500 preset-tonal-primary'
                                        : 'border-surface-200-800 bg-surface-50-950'}"
                                >
                                    <input type="radio" name="offer_type" value={option.value} bind:group={form.offer_type} class="sr-only" />
                                    <span class="flex items-center gap-2 text-lg font-bold">
                                        <option.icon class="h-5 w-5" />
                                        {option.label}
                                    </span>
                                    <span class="text-sm text-surface-800-200">{option.hint}</span>
                                </label>
                            {/each}
                        </div>
                    </fieldset>

                    {#if form.offer_type === 'aluguel'}
                        <div class="mt-4 grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="rental_unit">Cobrança</label>
                                <select id="rental_unit" bind:value={form.rental_unit} class={selectClass}>
                                    <option value="hora">Por hora</option>
                                    <option value="dia">Por dia</option>
                                    <option value="hectare">Por hectare</option>
                                </select>
                            </div>
                            <label class="flex cursor-pointer items-center gap-3 self-end rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm font-medium">
                                <input type="checkbox" bind:checked={form.operator_included} class="checkbox" />
                                Inclui operador
                            </label>
                        </div>
                    {/if}
                {/if}

                <div class="mt-5">
                    <label class={labelClass} for="price">Valor</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-surface-800-200">R$</span>
                        <input
                            id="price"
                            type="number"
                            inputmode="decimal"
                            bind:value={form.price}
                            placeholder="Ex: 500,00"
                            class="input h-16 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-14 pr-4 text-2xl font-bold shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <p class="mt-2 text-sm text-surface-800-200">
                        {form.category !== 'maquinario'
                            ? `Valor por ${stockUnitLabel(form.stock_unit, 1)}.`
                            : form.offer_type === 'aluguel'
                              ? `Valor do aluguel ${RENTAL_HINT[form.rental_unit]}${form.operator_included ? ', com operador' : ''}.`
                              : 'Valor pedido pela máquina.'}
                    </p>
                </div>

                <div class="mt-5">
                    <label class={labelClass} for="delivery">Entrega <span class="font-normal text-surface-700-300">(opcional)</span></label>
                    <select id="delivery" bind:value={form.delivery} class={selectClass}>
                        <option value="">Não informar</option>
                        {#each Object.entries(DELIVERY_LABEL) as [value, label] (value)}
                            <option {value}>{label}</option>
                        {/each}
                    </select>
                </div>

                {#if form.price && form.price > 0}
                    <div class="mt-5 rounded-container border border-primary-500 preset-tonal-primary p-4">
                        <p class="text-sm font-medium">Seu anúncio será publicado por:</p>
                        <p class="mt-1 text-3xl font-bold">
                            {form.category === 'maquinario'
                                ? listingPriceLabel('maquinario', form.price, form.offer_type, form.rental_unit)
                                : listingPriceLabel('produto', form.price, null, form.stock_unit)}
                        </p>
                        {#if form.name}
                            <p class="mt-1 truncate text-sm">{form.name}</p>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}

        <div class="mt-8 space-y-3">
            {#if currentStep === totalSteps - 1}
                <button
                    type="button"
                    onclick={handleSubmit}
                    disabled={!canProceed() || loading}
                    class="btn btn-lg preset-filled-primary-500 w-full"
                >
                    <CircleCheck size={18} />
                    <span>{loading ? 'Publicando...' : 'Publicar anúncio'}</span>
                </button>
                <button type="button" onclick={prevStep} disabled={loading} class="btn btn-lg preset-tonal w-full">
                    <ArrowLeft size={18} />
                    <span>Voltar e revisar</span>
                </button>
            {:else}
                <button
                    type="button"
                    onclick={nextStep}
                    disabled={!canProceed()}
                    class="btn btn-lg preset-filled-primary-500 w-full"
                >
                    <span>Próximo</span>
                    <ArrowRight size={18} />
                </button>
                <button type="button" onclick={prevStep} class="btn btn-lg preset-tonal w-full">
                    {#if currentStep > 0}<ArrowLeft size={18} />{/if}
                    <span>{currentStep === 0 ? 'Cancelar' : 'Voltar'}</span>
                </button>
            {/if}
        </div>
    </main>

    <BottomNav active="anunciar" />
</div>
