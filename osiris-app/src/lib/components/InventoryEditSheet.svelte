<script>
	import { Check } from 'lucide-svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { supabase } from '$lib/supabase';
	import ProductImageUrlsEditor from '$lib/components/ProductImageUrlsEditor.svelte';
	import MunicipioPicker from '$lib/components/MunicipioPicker.svelte';
	import { pickMunicipio } from '$lib/municipios';
	import {
		DELIVERY_LABEL,
		MACHINE_CONDITION_LABEL,
		MACHINE_OFFER_LABEL,
		RENTAL_UNIT_LABEL,
		categoryLabel,
		machineTypeLabel,
		stockUnitLabel,
		stockUnitName,
		tractionLabel
	} from '$lib/pricing';
	import { formatNumber } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

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

	function formatImageError(error) {
		if (error?.code === '42501' || error?.status === 403) {
			return m.anunciar_erro_imagens();
		}
		return m.anunciar_edit_imagens_parcial();
	}

	function normalizeImageRows(rows) {
		const active = (rows ?? []).filter((row) => !row.removed && isValidImageUrl(row.url));
		if (!active.length) return [createEmptyImageRow(true)];

		let hasCover = active.some((row) => row.is_cover);
		return active.map((row, index) => ({
			...row,
			is_cover: hasCover ? Boolean(row.is_cover) : index === 0
		}));
	}

	async function fetchProductImages(productId) {
		if (!productId) return [];

		const { data, error } = await supabase
			.from('product_images')
			.select('id, product_id, url, is_cover, created_at')
			.eq('product_id', productId)
			.order('is_cover', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Erro ao carregar imagens do produto:', error);
			return [];
		}

		return data ?? [];
	}

	async function syncProductImages(productId, images) {
		const active = (images ?? []).filter((img) => !img.removed && isValidImageUrl(img.url));
		const removedIds = (images ?? []).filter((img) => img.removed && img.id).map((img) => img.id);

		if (removedIds.length) {
			const { error } = await supabase.from('product_images').delete().in('id', removedIds);
			if (error) return error;
		}

		if (!active.length) return null;

		const coverIndex = Math.max(0, active.findIndex((img) => img.is_cover));
		let coverId = null;

		for (let i = 0; i < active.length; i++) {
			const img = active[i];
			const url = img.url.trim();

			if (img.id) {
				const { error } = await supabase.from('product_images').update({ url }).eq('id', img.id);
				if (error) return error;
				if (i === coverIndex) coverId = img.id;
			} else {
				const { data, error } = await supabase
					.from('product_images')
					.insert({ product_id: productId, url, is_cover: false })
					.select('id')
					.single();
				if (error) return error;
				if (i === coverIndex) coverId = data.id;
			}
		}

		await supabase.from('product_images').update({ is_cover: false }).eq('product_id', productId);
		if (coverId) {
			const { error } = await supabase
				.from('product_images')
				.update({ is_cover: true })
				.eq('id', coverId);
			if (error) return error;
		}

		return null;
	}

	function getMachineryFromProduct(product) {
		const machinery = product?.agricultural_machinery;
		if (!machinery) return null;
		return Array.isArray(machinery) ? machinery[0] : machinery;
	}

	function isMachineryProduct(product) {
		return product?.category === 'Maquinário';
	}

	async function updateProduct(productId, productPayload) {
		return supabase
			.from('products')
			.update({ ...productPayload, updated_at: new Date().toISOString() })
			.eq('id', productId);
	}

	async function updateMachinery(machineryId, machineryPayload) {
		return supabase
			.from('agricultural_machinery')
			.update({ ...machineryPayload, updated_at: new Date().toISOString() })
			.eq('id', machineryId);
	}

	let {
		open = $bindable(false),
		product = $bindable(null),
		brands = [],
		types = [],
		onsaved = () => {}
	} = $props();

	let saving = $state(false);
	let errorMessage = $state('');
	let images = $state([createEmptyImageRow(true)]);

	let form = $state({
		name: '',
		description: '',
		price: '',
		category: '',
		quantity: 1,
		stock_unit: 'Sacas',
		brand_id: '',
		type_id: '',
		model: '',
		serial_number: '',
		manufacture_year: '',
		current_horimeter: '',
		offer_type: 'aluguel',
		rental_unit: 'hora',
		operator_included: false,
		condition: '',
		power_hp: '',
		traction: '',
		brand_name: '',
		cultivar: '',
		harvest: '',
		min_order: '',
		delivery: '',
		municipio: null
	});

	const isMachinery = $derived(product ? isMachineryProduct(product) : false);

	// cultivar e safra só fazem sentido para sementes, mudas e grãos
	const SEED_CATEGORIES = ['Sementes', 'Mudas', 'Grãos'];

	// valores gravados em products.category e stock_unit (o texto visível vem de pricing.js)
	const PRODUCT_CATEGORIES = ['Sementes', 'Fertilizantes', 'Mudas', 'Defensivos', 'Corretivos', 'Grãos', 'Nutrição animal', 'Peças', 'Insumo', 'Outros'];
	const STOCK_UNITS = ['Sacas', 'Kg', 'Toneladas', 'Litros', 'Unidades'];

	const RENTAL_PRICE_LABEL = { hora: m.anunciar_preco_por_hora, dia: m.anunciar_preco_por_dia, hectare: m.anunciar_preco_por_hectare };
	const priceLabel = $derived(
		isMachinery
			? form.offer_type === 'aluguel'
				? (RENTAL_PRICE_LABEL[form.rental_unit] ?? RENTAL_PRICE_LABEL.hora)()
				: m.anunciar_preco_maquina()
			: m.anunciar_preco_por_unidade({ unidade: stockUnitLabel(form.stock_unit || 'Unidades', 1) })
	);
	const machinery = $derived(product ? getMachineryFromProduct(product) : null);

	async function loadImages(productId) {
		const rows = await fetchProductImages(productId);
		images =
			rows.length > 0
				? rows.map((row) => ({
						id: row.id,
						url: row.url,
						is_cover: row.is_cover,
						removed: false
					}))
				: [createEmptyImageRow(true)];
	}

	function resetForm() {
		if (!product) return;

		const mach = getMachineryFromProduct(product);

		form = {
			name: product.name ?? '',
			description: product.description ?? '',
			price: product.price != null ? String(product.price) : '',
			category: product.category ?? '',
			quantity: product.quantity ?? 1,
			stock_unit: product.stock_unit ?? 'Sacas',
			brand_id: mach?.brand_id ?? '',
			type_id: mach?.type_id ?? '',
			model: mach?.model ?? '',
			serial_number: mach?.serial_number ?? '',
			manufacture_year: mach?.manufacture_year != null ? String(mach.manufacture_year) : '',
			current_horimeter: mach?.current_horimeter != null ? String(mach.current_horimeter) : '',
			offer_type: mach?.offer_type ?? 'aluguel',
			rental_unit: mach?.rental_unit ?? 'hora',
			operator_included: Boolean(mach?.operator_included),
			condition: mach?.condition ?? '',
			power_hp: mach?.power_hp != null ? String(mach.power_hp) : '',
			traction: mach?.traction ?? '',
			cultivar: product.cultivar ?? '',
			harvest: product.harvest ?? '',
			brand_name: product.brand_name ?? '',
			min_order: product.min_order != null ? String(product.min_order) : '',
			delivery: product.delivery ?? '',
			municipio: pickMunicipio(product.municipio)
		};
		errorMessage = '';
		void loadImages(product.id);
	}

	function closeSheet() {
		open = false;
		errorMessage = '';
	}

	function validate() {
		if (!form.name.trim()) {
			errorMessage = m.anunciar_edit_informe_titulo();
			return false;
		}

		const price = Number(form.price);
		if (!Number.isFinite(price) || price <= 0) {
			errorMessage = m.anunciar_edit_preco_invalido();
			return false;
		}

		if (isMachinery) {
			if (!form.brand_id || !form.type_id || !form.model.trim()) {
				errorMessage = m.anunciar_edit_marca_tipo_modelo();
				return false;
			}
		} else if (!form.category) {
			errorMessage = m.anunciar_edit_selecione_categoria();
			return false;
		} else if (form.harvest.trim() && !/^\d{4}(\/\d{2})?$/.test(form.harvest.trim())) {
			errorMessage = m.anunciar_edit_safra_invalida();
			return false;
		}

		errorMessage = '';
		return true;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		if (!product || !validate()) return;

		saving = true;
		errorMessage = '';

		const price = Number(form.price);

		const { error: productError } = await updateProduct(product.id, {
			name: form.name.trim(),
			description: form.description.trim() || null,
			municipio_id: form.municipio?.codigo_ibge ?? null,
			delivery: form.delivery || null,
			price,
			...(isMachinery
				? { category: 'Maquinário', quantity: 1, stock_unit: 'Unidade' }
				: {
						category: form.category,
						quantity: Number(form.quantity) || 1,
						stock_unit: form.stock_unit,
						brand_name: form.brand_name.trim() || null,
						min_order: Number(form.min_order) > 0 ? Number(form.min_order) : null,
						cultivar: SEED_CATEGORIES.includes(form.category) ? form.cultivar.trim() || null : null,
						harvest: SEED_CATEGORIES.includes(form.category) ? form.harvest.trim() || null : null
					})
		});

		if (productError) {
			errorMessage = m.anunciar_edit_erro_salvar();
			saving = false;
			return;
		}

		if (isMachinery && machinery?.id) {
			const { error: machineryError } = await updateMachinery(machinery.id, {
				offer_type: form.offer_type,
				rental_unit: form.rental_unit,
				operator_included: form.offer_type === 'aluguel' && form.operator_included,
				condition: form.condition || null,
				power_hp: Number(form.power_hp) > 0 ? Math.round(Number(form.power_hp)) : null,
				traction: form.traction || null,
				brand_id: form.brand_id,
				type_id: form.type_id,
				model: form.model.trim(),
				serial_number: form.serial_number.trim() || null,
				manufacture_year: parseInt(form.manufacture_year, 10),
				current_horimeter: parseFloat(form.current_horimeter)
			});

			if (machineryError) {
				errorMessage = m.anunciar_edit_erro_maquinario();
				saving = false;
				return;
			}
		}

		const imageError = await syncProductImages(product.id, normalizeImageRows(images));
		if (imageError) {
			errorMessage = formatImageError(imageError);
			saving = false;
			return;
		}

		saving = false;
		closeSheet();
		onsaved();
	}

	$effect(() => {
		if (open && product) resetForm();
	});
</script>

<AppDialog
	bind:open
	title={m.anunciar_edit_titulo()}
	variant="sheet"
	size="md"
	dismissible={!saving}
	onclose={closeSheet}
>
	{#if product}
		<form id="inventory-edit-form" class="space-y-4" onsubmit={handleSubmit}>
			{#if errorMessage}
				<div class="rounded-container preset-tonal-error p-3 text-sm text-error-500">{errorMessage}</div>
			{/if}

			<div>
				<label for="edit-name" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_titulo()}</label>
				<input
					id="edit-name"
					placeholder={m.anunciar_ph_titulo_maquina()}
					type="text"
					bind:value={form.name}
					required
					class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			<div>
				<label for="edit-description" class="mb-1 block text-sm font-medium text-surface-900-100"
					>{m.anunciar_descricao()}</label
				>
				<textarea
					id="edit-description"
					placeholder={m.anunciar_ph_descricao_curta()}
					rows="3"
					bind:value={form.description}
					class="textarea w-full resize-none rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				></textarea>
			</div>

			{#if isMachinery}
				<div>
					<label for="edit-offer-type" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_tipo_negocio()}</label>
					<select
						id="edit-offer-type"
						bind:value={form.offer_type}
						class="select w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					>
						<option value="aluguel">{MACHINE_OFFER_LABEL.aluguel}</option>
						<option value="venda">{m.anunciar_venda_preco_maquina()}</option>
					</select>
				</div>

				{#if form.offer_type === 'aluguel'}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="edit-rental-unit" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_cobranca()}</label>
							<select
								id="edit-rental-unit"
								bind:value={form.rental_unit}
								class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
							>
								{#each Object.entries(RENTAL_UNIT_LABEL) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<label class="flex cursor-pointer items-center gap-3 self-end rounded-container border border-surface-200-800 px-3 py-3 text-sm font-medium">
							<input type="checkbox" bind:checked={form.operator_included} class="checkbox" />
							{m.anunciar_inclui_operador()}
						</label>
					</div>
				{/if}
			{/if}

			<div>
				<label for="edit-price" class="mb-1 block text-sm font-medium text-surface-900-100">
					{priceLabel}
				</label>
				<input
					id="edit-price"
					placeholder={m.anunciar_exemplo({ valor: formatNumber(500, { minimumFractionDigits: 2 }) })}
					type="number"
					min="0"
					step="0.01"
					bind:value={form.price}
					required
					class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			{#if isMachinery}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-type" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_tipo()}</label>
						<select
							id="edit-type"
							bind:value={form.type_id}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="" disabled>{m.anunciar_selecione()}</option>
							{#each types as type (type.id)}
								<option value={type.id}>{machineTypeLabel(type.name)}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-brand" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_marca()}</label>
						<select
							id="edit-brand"
							bind:value={form.brand_id}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="" disabled>{m.anunciar_selecione()}</option>
							{#each brands as brand (brand.id)}
								<option value={brand.id}>{brand.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="edit-model" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_modelo()}</label>
					<input
						id="edit-model"
						placeholder={m.anunciar_exemplo({ valor: '6100J' })}
						type="text"
						bind:value={form.model}
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
					/>
				</div>

				<div>
					<label for="edit-serial" class="mb-1 block text-sm font-medium text-surface-900-100"
						>{m.anunciar_numero_serie()}</label
					>
					<input
						id="edit-serial"
						placeholder={m.anunciar_exemplo({ valor: '123456789ABC' })}
						type="text"
						bind:value={form.serial_number}
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-condition" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_condicao()}</label>
						<select
							id="edit-condition"
							bind:value={form.condition}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="">{m.anunciar_nao_informada()}</option>
							{#each Object.entries(MACHINE_CONDITION_LABEL) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-power" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_potencia()}</label>
						<input
							id="edit-power"
							placeholder={m.anunciar_exemplo({ valor: '110' })}
							type="number"
							min="1"
							bind:value={form.power_hp}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
				</div>

				<div>
					<label for="edit-traction" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_tracao()}</label>
					<select
						id="edit-traction"
						bind:value={form.traction}
						class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
					>
						<option value="">{m.anunciar_nao_informada()}</option>
						<option value="4x2">4x2</option>
						<option value="4x4">4x4</option>
						<option value="esteira">{tractionLabel('esteira')}</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-year" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_ano()}</label>
						<input
							id="edit-year"
							placeholder={m.anunciar_exemplo({ valor: '2018' })}
							type="number"
							min="1950"
							bind:value={form.manufacture_year}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
					<div>
						<label for="edit-horimeter" class="mb-1 block text-sm font-medium text-surface-900-100"
							>{m.anunciar_horimetro()}</label
						>
						<input
							id="edit-horimeter"
							placeholder={m.anunciar_exemplo({ valor: '2500' })}
							type="number"
							bind:value={form.current_horimeter}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
				</div>
			{:else}
				<div>
					<label for="edit-category" class="mb-1 block text-sm font-medium text-surface-900-100"
						>{m.anunciar_categoria()}</label
					>
					<select
						id="edit-category"
						bind:value={form.category}
						class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
					>
						<option value="" disabled>{m.anunciar_selecione()}</option>
						{#each PRODUCT_CATEGORIES as value (value)}
							<option {value}>{value === 'Corretivos' ? m.anunciar_cat_corretivos_opcao() : categoryLabel(value)}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-qty" class="mb-1 block text-sm font-medium text-surface-900-100"
							>{m.anunciar_quantidade()}</label
						>
						<input
							id="edit-qty"
							placeholder={m.anunciar_exemplo({ valor: '100' })}
							type="number"
							min="1"
							bind:value={form.quantity}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
					<div>
						<label for="edit-unit" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_unidade()}</label>
						<select
							id="edit-unit"
							bind:value={form.stock_unit}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							{#each STOCK_UNITS as value (value)}
								<option {value}>{stockUnitName(value)}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-brand-name" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_marca_fabricante()}</label>
						<input
							id="edit-brand-name"
							placeholder={m.anunciar_exemplo({ valor: 'Brasmax' })}
							type="text"
							maxlength="80"
							bind:value={form.brand_name}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
					<div>
						<label for="edit-min-order" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_pedido_minimo()}</label>
						<input
							id="edit-min-order"
							placeholder={m.anunciar_em_unidade({ unidade: stockUnitLabel(form.stock_unit) })}
							type="number"
							min="1"
							bind:value={form.min_order}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
				</div>

				{#if SEED_CATEGORIES.includes(form.category)}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="edit-cultivar" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_cultivar()}</label>
							<input
								id="edit-cultivar"
								placeholder={m.anunciar_exemplo({ valor: 'BMX Zeus IPRO' })}
								type="text"
								maxlength="80"
								bind:value={form.cultivar}
								class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
							/>
						</div>
						<div>
							<label for="edit-harvest" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_safra()}</label>
							<input
								id="edit-harvest"
								placeholder={m.anunciar_exemplo({ valor: '2025/26' })}
								type="text"
								maxlength="7"
								bind:value={form.harvest}
								class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
							/>
						</div>
					</div>
				{/if}
			{/if}

			<div>
				<label for="edit-delivery" class="mb-1 block text-sm font-medium text-surface-900-100">{m.anunciar_entrega()}</label>
				<select
					id="edit-delivery"
					bind:value={form.delivery}
					class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
				>
					<option value="">{m.anunciar_nao_informar()}</option>
					{#each Object.entries(DELIVERY_LABEL) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</div>

			<MunicipioPicker
				id="edit-municipio"
				label={isMachinery ? m.anunciar_cidade_maquina() : m.anunciar_cidade_produto()}
				bind:value={form.municipio}
			/>

			<ProductImageUrlsEditor bind:images />
		</form>
	{/if}

	{#snippet footer()}
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={closeSheet}
				disabled={saving}
				class="btn btn-lg preset-tonal w-full"
			>
				<span>{m.comum_cancelar()}</span>
			</button>
			<button
				type="submit"
				form="inventory-edit-form"
				disabled={saving}
				class="btn btn-lg preset-filled-primary-500 w-full"
			>
				<Check size={18} />
				<span>{saving ? m.comum_salvando() : m.comum_salvar()}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>
