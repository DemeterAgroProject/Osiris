<script>
    import { ToggleGroup } from '@skeletonlabs/skeleton-svelte';
    import AppSteps from '$lib/components/ui/AppSteps.svelte';
    import { showToast } from '$lib/components/ui/toast.js';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { supabase } from '$lib/supabase';
    import { requireUser } from '$lib/auth';
    import { track, trackError } from '$lib/telemetry';
    import { onMount } from 'svelte';
    import { ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, Users, Briefcase, MapPin } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import MunicipioPicker from '$lib/components/MunicipioPicker.svelte';
    import { fetchMyMunicipio, formatMunicipio } from '$lib/municipios';
    import { pricingModelLabel, serviceTypeLabel } from '$lib/pricing';
    import { formatNumber } from '$lib/i18n';
    import { m } from '$lib/paraglide/messages';

    const SERVICE_TYPE_OPTIONS = [
        { value: 'Mão de Obra', hint: m.anunciar_servico_mao_de_obra_dica, icon: Users, tone: 'preset-tonal-primary' },
        { value: 'Pacote Completo', hint: m.anunciar_servico_pacote_dica, icon: Briefcase, tone: 'preset-tonal-secondary' }
    ];

    // valores aceitos por services_pricing_model_check
    const PRICING_OPTIONS = [
        { value: 'Por Hora', hint: m.anunciar_modelo_hora_dica },
        { value: 'Por Hectare', hint: m.anunciar_modelo_hectare_dica },
        { value: 'Empreitada/Fixo', hint: m.anunciar_modelo_empreitada_dica },
        { value: 'A Combinar', hint: m.anunciar_modelo_a_combinar_dica }
    ];

    const labelClass = 'mb-1.5 block text-sm font-semibold text-surface-950-50';
    const fieldClass = 'input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-4 text-base outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

    // id de cada abertura do formulário: separa desistência e publicação na mesma sessão
    const tentativa = crypto.randomUUID().slice(0, 8);

    // pede o login antes de a pessoa preencher as etapas, não só no envio
    onMount(async () => {
        if (!(await requireUser('/servicos/novo'))) return;
        track('servico_iniciado', { tentativa });
        const municipio = await fetchMyMunicipio();
        if (municipio && !form.municipio) form.municipio = municipio;
    });

    let currentStep = $state(0);
    const totalSteps = 3;
    let loading = $state(false);
    let message = $state({ text: '', type: '' });

    let form = $state({
        service_type: '', // 'Mão de Obra' ou 'Pacote Completo'
        title: '',
        description: '',
        municipio: null, // cidade-base (município do IBGE)
        location: '', // área de atendimento, texto livre (opcional)
        pricing_model: 'Por Hora', // 'Por Hora', 'Por Hectare', 'Empreitada/Fixo', 'A Combinar'
        price: null,
        image_url: '', // foto de capa (opcional)
        equipment: '', // equipamento incluso (opcional)
        service_radius_km: '' // até quantos km da cidade (opcional)
    });

    const imageUrlInvalid = $derived(form.image_url.trim() !== '' && !/^https?:\/\/\S+$/i.test(form.image_url.trim()));

    function canProceed() {
        if (currentStep === 0) return form.service_type !== '';
        if (currentStep === 1) return form.title.trim().length > 0 && form.description.trim().length > 0 && Boolean(form.municipio) && !imageUrlInvalid;
        if (currentStep === 2) {
            if (form.pricing_model === 'A Combinar') return true;
            return form.price !== null && form.price > 0;
        }
        return true;
    }

    function nextStep() {
        if (currentStep < totalSteps - 1 && canProceed()) {
            currentStep++;
            track('servico_etapa', { tentativa, etapa: currentStep, tipo: form.service_type });
        }
    }

    function prevStep() {
        if (currentStep > 0) currentStep--;
        else goto(resolve('/servicos'));
    }

    async function handleSubmit() {
        loading = true;
        message = { text: '', type: '' };

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            message = { text: m.anunciar_servico_precisa_login(), type: 'error' };
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
            municipio_id: form.municipio?.codigo_ibge ?? null,
            // sem texto, a área de atendimento é a própria cidade
            location: form.location.trim() || formatMunicipio(form.municipio),
            image_url: form.image_url.trim() || null,
            equipment: form.equipment.trim() || null,
            service_radius_km: Number(form.service_radius_km) > 0 ? Math.round(Number(form.service_radius_km)) : null,
            status: 'ativo'
        });

        if (error) {
            trackError('servico_falhou', error, { tentativa, tipo: form.service_type });
            message = { text: m.anunciar_servico_erro_publicar(), type: 'error' };
            loading = false;
        } else {
            track('servico_publicado', { tentativa, tipo: form.service_type, cobranca: form.pricing_model });
            showToast(m.anunciar_servico_publicado_sucesso(), 'success');
            await goto(resolve('/servicos'));
        }
    }
</script>

<svelte:head>
	<title>{m.anunciar_servico_novo()} — Osiris</title>
</svelte:head>

<div class="flex min-h-screen flex-col pb-24 lg:pb-0">
    <Header title={m.anunciar_servico_oferecer()} backHref="/servicos" />

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div class="mb-5 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
            <AppSteps
                bind:step={currentStep}
                labels={[m.anunciar_etapa_tipo(), m.anunciar_etapa_detalhes(), m.anunciar_cobranca()]}
                label={m.anunciar_servico_etapas_label()}
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
                <h1 class="preset-typo-headline">{m.anunciar_servico_como_atuar()}</h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_toque_opcao()}</p>

                <ToggleGroup
                    value={form.service_type ? [form.service_type] : []}
                    deselectable={false}
                    onValueChange={(details) => (form.service_type = details.value[0] ?? form.service_type)}
                    class="mt-5 grid! w-full! grid-cols-1 gap-3 overflow-visible! rounded-none! border-0! bg-transparent! sm:grid-cols-2"
                >
                    {#each SERVICE_TYPE_OPTIONS as option (option.value)}
                        {@const selected = form.service_type === option.value}
                        <ToggleGroup.Item
                            value={option.value}
                            class="flex! min-h-28 w-full! min-w-0 aspect-auto! items-center justify-start! gap-4 rounded-container border-2! border-surface-200-800 bg-surface-50-950 p-4 text-left shadow-sm transition-colors hover:border-primary-500! data-[state=on]:border-primary-500! data-[state=on]:preset-tonal-primary"
                        >
                            <span class="flex size-14 shrink-0 items-center justify-center rounded-container {option.tone}">
                                <option.icon class="size-7" />
                            </span>
                            <span class="min-w-0 flex-1 whitespace-normal">
                                <span class="block text-lg font-bold leading-6 text-surface-950-50">{serviceTypeLabel(option.value)}</span>
                                <span class="mt-0.5 block text-sm leading-5 text-surface-800-200">{option.hint()}</span>
                            </span>
                            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 {selected ? 'border-primary-500 preset-filled-primary-500' : 'border-surface-300-700'}">
                                {#if selected}<Check class="h-4 w-4" />{/if}
                            </span>
                        </ToggleGroup.Item>
                    {/each}
                </ToggleGroup>
            </div>

        {:else if currentStep === 1}
            <div class="flex flex-1 flex-col">
                <h1 class="preset-typo-headline">{m.anunciar_servico_detalhes()}</h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_servico_detalhes_sub()}</p>

                <div class="mt-5 space-y-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm">
                    <div>
                        <label class={labelClass} for="title">{m.anunciar_servico_titulo()}</label>
                        <input
                            type="text"
                            id="title"
                            bind:value={form.title}
                            placeholder={form.service_type === 'Mão de Obra' ? m.anunciar_servico_ph_titulo_mao() : m.anunciar_servico_ph_titulo_pacote()}
                            class={fieldClass}
                        />
                    </div>

                    <div>
                        <label class={labelClass} for="description">{m.anunciar_servico_incluso()}</label>
                        <textarea
                            id="description"
                            bind:value={form.description}
                            rows="4"
                            placeholder={m.anunciar_servico_ph_descricao()}
                            class="textarea w-full rounded-container border border-surface-200-800 bg-surface-50-950 p-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        ></textarea>
                    </div>

                    <MunicipioPicker
                        id="servico-municipio"
                        label={m.anunciar_servico_cidade()}
                        required
                        bind:value={form.municipio}
                    />

                    <div>
                        <label class={labelClass} for="location">{m.anunciar_servico_area()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                        <div class="relative">
                            <MapPin class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-700-300" />
                            <input
                                type="text"
                                id="location"
                                bind:value={form.location}
                                placeholder={m.anunciar_servico_ph_area()}
                                class="{fieldClass} pl-11"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="col-span-2 sm:col-span-1">
                            <label class={labelClass} for="equipment">{m.anunciar_servico_equipamento()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                            <input
                                type="text"
                                id="equipment"
                                bind:value={form.equipment}
                                maxlength="200"
                                placeholder={m.anunciar_servico_ph_equipamento()}
                                class={fieldClass}
                            />
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class={labelClass} for="service_radius_km">{m.anunciar_servico_raio()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                            <input
                                type="number"
                                inputmode="numeric"
                                id="service_radius_km"
                                bind:value={form.service_radius_km}
                                min="1"
                                placeholder={m.anunciar_exemplo({ valor: '80' })}
                                class={fieldClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label class={labelClass} for="image_url">{m.anunciar_servico_foto()} <span class="font-normal text-surface-700-300">({m.comum_opcional()})</span></label>
                        <input
                            type="url"
                            id="image_url"
                            bind:value={form.image_url}
                            placeholder={m.anunciar_ph_link_foto()}
                            class={fieldClass}
                        />
                        {#if imageUrlInvalid}
                            <p class="mt-1 text-sm font-medium text-error-600-400">{m.anunciar_servico_foto_invalida()}</p>
                        {:else if form.image_url.trim()}
                            <img src={form.image_url.trim()} alt={m.anunciar_servico_foto_previa_alt()} class="mt-2 h-36 w-full rounded-container object-cover" />
                        {/if}
                    </div>
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="flex flex-1 flex-col">
                <h1 class="preset-typo-headline">{m.anunciar_servico_como_cobra()}</h1>
                <p class="mt-1 preset-typo-subtitle">{m.anunciar_servico_como_cobra_sub()}</p>

                <fieldset class="mt-5">
                    <legend class="mb-2 text-sm font-semibold text-surface-950-50">{m.anunciar_formato_cobranca()}</legend>
                    <div class="grid grid-cols-2 gap-3">
                        {#each PRICING_OPTIONS as option (option.value)}
                            {@const selected = form.pricing_model === option.value}
                            <label
                                class="flex cursor-pointer flex-col gap-0.5 rounded-container border-2 p-3.5 shadow-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 {selected
                                    ? 'border-primary-500 preset-tonal-primary'
                                    : 'border-surface-200-800 bg-surface-50-950'}"
                            >
                                <input type="radio" name="pricing_model" value={option.value} bind:group={form.pricing_model} class="sr-only" />
                                <span class="text-base font-bold">{pricingModelLabel(option.value)}</span>
                                <span class="text-xs text-surface-800-200">{option.hint()}</span>
                            </label>
                        {/each}
                    </div>
                </fieldset>

                {#if form.pricing_model !== 'A Combinar'}
                    <div class="mt-5">
                        <label class={labelClass} for="price">{m.anunciar_valor()}</label>
                        <div class="relative">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-surface-800-200">R$</span>
                            <input
                                type="number"
                                inputmode="decimal"
                                id="price"
                                bind:value={form.price}
                                placeholder={m.anunciar_exemplo({ valor: formatNumber(150, { minimumFractionDigits: 2 }) })}
                                class="input h-16 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-14 pr-4 text-2xl font-bold shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
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
                    <span>{loading ? m.comum_salvando() : m.anunciar_servico_publicar()}</span>
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
