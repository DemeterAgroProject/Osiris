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
    import { DELIVERY_LABEL, categoryLabel, listingPriceLabel, machineTypeLabel, MACHINE_CONDITION_LABEL, MACHINE_OFFER_LABEL, RENTAL_UNIT_LABEL, stockUnitLabel, stockUnitName, tractionLabel } from '$lib/pricing';
    import { formatNumber } from '$lib/i18n';
    import { m } from '$lib/paraglide/messages';

    const RENTAL_HINT = { hora: m.anunciar_periodo_hora, dia: m.anunciar_periodo_dia, hectare: m.anunciar_periodo_hectare };

    // valores gravados em products.category (o texto visível vem de categoryLabel)
    const PRODUCT_CATEGORIES = ['Sementes', 'Fertilizantes', 'Mudas', 'Defensivos', 'Corretivos', 'Grãos', 'Nutrição animal', 'Peças', 'Outros'];
    const STOCK_UNITS = ['Sacas', 'Kg', 'Toneladas', 'Litros', 'Unidades'];

    // cultivar e safra só fazem sentido para sementes, mudas e grãos
    const SEED_CATEGORIES = ['Sementes', 'Mudas', 'Grãos'];
    const harvestInvalid = $derived(form.harvest.trim() !== '' && !/^\d{4}(\/\d{2})?$/.test(form.harvest.trim()));
    import AppSteps from '$lib/components/ui/AppSteps.svelte';
    import { showToast } from '$lib/components/ui/toast.js';

    const CATEGORY_OPTIONS = [
        { value: 'maquinario', label: m.anunciar_opcao_maquina, hint: m.anunciar_opcao_maquina_dica, icon: Tractor, tone: 'preset-tonal-primary' },
        { value: 'produto', label: m.anunciar_opcao_insumo, hint: m.anunciar_opcao_insumo_dica, icon: Leaf, tone: 'preset-tonal-tertiary' }
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
            return m.anunciar_erro_serie();
        }
        if (
            (error?.code === '42501' || error?.status === 403) &&
            String(error?.message ?? '').includes('product_images')
        ) {
            return m.anunciar_erro_imagens();
        }
        return m.anunciar_erro_publicar();
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
            message = { text: m.anunciar_precisa_login(), type: 'error' };
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
            showToast(m.anunciar_publicado_sucesso(), 'success');
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
	<title>{m.anunciar_novo_anuncio()} — Osiris</title>
</svelte:head>

<div class="flex min-h-screen flex-col pb-24">
    <Header title={m.anunciar_novo_anuncio()} backHref="/inventario" />

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <div class="mb-5 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
            <AppSteps
                bind:step={currentStep}
                labels={[m.anunciar_etapa_categoria(), m.anunciar_etapa_detalhes(), m.anunciar_etapa_preco()]}
                label={m.anunciar_etapas_label()}
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
                <h1 class="preset-typo-headline">{m.anunciar_o_que_anunciar()}</h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_toque_opcao()}</p>

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
                                <span class="block text-lg font-bold text-surface-950-50">{option.label()}</span>
                                <span class="block text-sm text-surface-800-200">{option.hint()}</span>
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
                    {form.category === 'maquinario' ? m.anunciar_detalhes_maquina() : m.anunciar_detalhes_produto()}
                </h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_detalhes_sub()}</p>

                <div class="mt-5 space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <div>
                        <label class={labelClass} for="name">{m.anunciar_titulo_anuncio()}</label>
                        <input
                            type="text"
                            id="name"
                            bind:value={form.name}
                            placeholder={form.category === 'maquinario' ? m.anunciar_ph_titulo_maquina() : m.anunciar_ph_titulo_produto()}
                            class={fieldClass}
                        />
                    </div>

                    <div>
                        <label class={labelClass} for="description">{m.anunciar_descricao()}</label>
                        <textarea
                            id="description"
                            bind:value={form.description}
                            rows="4"
                            placeholder={m.anunciar_ph_descricao()}
                            class="{fieldClass} h-auto py-3"
                        ></textarea>
                    </div>

                    {#if form.category === 'maquinario'}
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="type">{m.anunciar_tipo()}</label>
                                <select id="type" bind:value={form.type_id} class={selectClass}>
                                    <option value="" disabled>{m.anunciar_selecione()}</option>
                                    {#each types as type (type.id)}
                                        <option value={type.id}>{machineTypeLabel(type.name)}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class={labelClass} for="brand">{m.anunciar_marca()}</label>
                                <select id="brand" bind:value={form.brand_id} class={selectClass}>
                                    <option value="" disabled>{m.anunciar_selecione()}</option>
                                    {#each brands as brand (brand.id)}
                                        <option value={brand.id}>{brand.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class={labelClass} for="model">{m.anunciar_modelo()}</label>
                            <input type="text" id="model" bind:value={form.model} placeholder={m.anunciar_exemplo({ valor: '6100J' })} class={fieldClass} />
                        </div>

                        <div>
                            <label class={labelClass} for="serial_number">{m.anunciar_numero_serie_chassi()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                            <input type="text" id="serial_number" bind:value={form.serial_number} placeholder={m.anunciar_exemplo({ valor: '123456789ABC' })} class={fieldClass} />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="condition">{m.anunciar_condicao()}</label>
                                <select id="condition" bind:value={form.condition} class={selectClass}>
                                    <option value="" disabled>{m.anunciar_selecione()}</option>
                                    {#each Object.entries(MACHINE_CONDITION_LABEL) as [value, label] (value)}
                                        <option {value}>{label}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class={labelClass} for="power">{m.anunciar_potencia()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                                <input type="number" inputmode="numeric" id="power" bind:value={form.power_hp} placeholder={m.anunciar_exemplo({ valor: '110' })} min="1" class={fieldClass} />
                            </div>
                        </div>

                        <div>
                            <label class={labelClass} for="traction">{m.anunciar_tracao()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                            <select id="traction" bind:value={form.traction} class={selectClass}>
                                <option value="">{m.anunciar_nao_informar()}</option>
                                <option value="4x2">4x2</option>
                                <option value="4x4">4x4</option>
                                <option value="esteira">{tractionLabel('esteira')}</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="year">{m.anunciar_ano_fabricacao()}</label>
                                <input type="number" inputmode="numeric" id="year" bind:value={form.manufacture_year} placeholder={m.anunciar_exemplo({ valor: '2018' })} min="1950" class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="horimeter">{m.anunciar_horimetro_horas()}</label>
                                <input type="number" inputmode="numeric" id="horimeter" bind:value={form.current_horimeter} placeholder={m.anunciar_exemplo({ valor: '2500' })} class={fieldClass} />
                            </div>
                        </div>

                    {:else if form.category === 'produto'}
                        <div>
                            <label class={labelClass} for="prod_category">{m.anunciar_categoria_insumo()}</label>
                            <select id="prod_category" bind:value={form.product_category} class={selectClass}>
                                <option value="" disabled>{m.anunciar_selecione_categoria()}</option>
                                {#each PRODUCT_CATEGORIES as value (value)}
                                    <option {value}>{value === 'Corretivos' ? m.anunciar_cat_corretivos_opcao() : categoryLabel(value)}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="qty">{m.anunciar_quantidade()}</label>
                                <input type="number" inputmode="numeric" id="qty" bind:value={form.quantity} min="1" class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="unit">{m.anunciar_unidade()}</label>
                                <select id="unit" bind:value={form.stock_unit} class={selectClass}>
                                    {#each STOCK_UNITS as value (value)}
                                        <option {value}>{stockUnitName(value)}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class={labelClass} for="brand_name">{m.anunciar_marca_fabricante()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                                <input type="text" id="brand_name" bind:value={form.brand_name} maxlength="80" placeholder={m.anunciar_exemplo({ valor: 'Brasmax' })} class={fieldClass} />
                            </div>
                            <div>
                                <label class={labelClass} for="min_order">{m.anunciar_pedido_minimo()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                                <input type="number" inputmode="numeric" id="min_order" bind:value={form.min_order} min="1" placeholder={m.anunciar_em_unidade({ unidade: stockUnitLabel(form.stock_unit) })} class={fieldClass} />
                            </div>
                        </div>
                        {#if SEED_CATEGORIES.includes(form.product_category)}
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class={labelClass} for="cultivar">{m.anunciar_cultivar()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                                    <input type="text" id="cultivar" bind:value={form.cultivar} maxlength="80" placeholder={m.anunciar_exemplo({ valor: 'BMX Zeus IPRO' })} class={fieldClass} />
                                </div>
                                <div>
                                    <label class={labelClass} for="harvest">{m.anunciar_safra()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                                    <input type="text" id="harvest" bind:value={form.harvest} maxlength="7" placeholder={m.anunciar_exemplo({ valor: '2025/26' })} aria-invalid={harvestInvalid ? 'true' : undefined} class={fieldClass} />
                                    {#if harvestInvalid}
                                        <p class="mt-1 text-xs text-error-600">{m.anunciar_safra_invalida()}</p>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>

                <div class="mt-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <MunicipioPicker
                        id="anuncio-municipio"
                        label={form.category === 'maquinario' ? m.anunciar_cidade_maquina() : m.anunciar_cidade_produto()}
                        hint={m.anunciar_cidade_dica()}
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
                <h1 class="preset-typo-headline">{m.anunciar_valor_titulo()}</h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_valor_sub()}</p>

                {#if form.category === 'maquinario'}
                    <fieldset class="mt-5">
                        <legend class="mb-2 text-sm font-semibold text-surface-950-50">{m.anunciar_tipo_negocio()}</legend>
                        <div class="grid grid-cols-2 gap-3">
                            {#each [{ value: 'aluguel', label: MACHINE_OFFER_LABEL.aluguel, hint: m.anunciar_aluguel_dica(), icon: Timer }, { value: 'venda', label: MACHINE_OFFER_LABEL.venda, hint: m.anunciar_venda_dica(), icon: Tag }] as option (option.value)}
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
                                <label class={labelClass} for="rental_unit">{m.anunciar_cobranca()}</label>
                                <select id="rental_unit" bind:value={form.rental_unit} class={selectClass}>
                                    {#each Object.entries(RENTAL_UNIT_LABEL) as [value, label] (value)}
                                        <option {value}>{label}</option>
                                    {/each}
                                </select>
                            </div>
                            <label class="flex cursor-pointer items-center gap-3 self-end rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3 text-sm font-medium">
                                <input type="checkbox" bind:checked={form.operator_included} class="checkbox" />
                                {m.anunciar_inclui_operador()}
                            </label>
                        </div>
                    {/if}
                {/if}

                <div class="mt-5">
                    <label class={labelClass} for="price">{m.anunciar_valor()}</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-surface-800-200">R$</span>
                        <input
                            id="price"
                            type="number"
                            inputmode="decimal"
                            bind:value={form.price}
                            placeholder={m.anunciar_exemplo({ valor: formatNumber(500, { minimumFractionDigits: 2 }) })}
                            class="input h-16 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-14 pr-4 text-2xl font-bold shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <p class="mt-2 text-sm text-surface-800-200">
                        {form.category !== 'maquinario'
                            ? m.anunciar_valor_por({ unidade: stockUnitLabel(form.stock_unit, 1) })
                            : form.offer_type === 'aluguel'
                              ? (form.operator_included ? m.anunciar_valor_aluguel_operador : m.anunciar_valor_aluguel)({ periodo: (RENTAL_HINT[form.rental_unit] ?? RENTAL_HINT.hora)() })
                              : m.anunciar_valor_maquina()}
                    </p>
                </div>

                <div class="mt-5">
                    <label class={labelClass} for="delivery">{m.anunciar_entrega()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                    <select id="delivery" bind:value={form.delivery} class={selectClass}>
                        <option value="">{m.anunciar_nao_informar()}</option>
                        {#each Object.entries(DELIVERY_LABEL) as [value, label] (value)}
                            <option {value}>{label}</option>
                        {/each}
                    </select>
                </div>

                {#if form.price && form.price > 0}
                    <div class="mt-5 rounded-container border border-primary-500 preset-tonal-primary p-4">
                        <p class="text-sm font-medium">{m.anunciar_publicado_por()}</p>
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
                    <span>{loading ? m.anunciar_publicando() : m.anunciar_publicar()}</span>
                </button>
                <button type="button" onclick={prevStep} disabled={loading} class="btn btn-lg preset-tonal w-full">
                    <ArrowLeft size={18} />
                    <span>{m.anunciar_voltar_revisar()}</span>
                </button>
            {:else}
                <button
                    type="button"
                    onclick={nextStep}
                    disabled={!canProceed()}
                    class="btn btn-lg preset-filled-primary-500 w-full"
                >
                    <span>{m.anunciar_proximo()}</span>
                    <ArrowRight size={18} />
                </button>
                <button type="button" onclick={prevStep} class="btn btn-lg preset-tonal w-full">
                    {#if currentStep > 0}<ArrowLeft size={18} />{/if}
                    <span>{currentStep === 0 ? m.comum_cancelar() : m.comum_voltar()}</span>
                </button>
            {/if}
        </div>
    </main>

    <BottomNav active="anunciar" />
</div>
