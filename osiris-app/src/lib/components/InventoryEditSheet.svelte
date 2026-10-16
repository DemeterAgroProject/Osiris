<script>
	import { Check } from 'lucide-svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { supabase } from '$lib/supabase';
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

	function formatImageError(error) {
		if (error?.code === '42501' || error?.status === 403) {
			return 'Não foi possível salvar as imagens. Tente novamente.';
		}
		return 'Anúncio salvo, mas falhou ao atualizar as imagens.';
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
		offer_type: 'aluguel'
	});

	const isMachinery = $derived(product ? isMachineryProduct(product) : false);
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

		const m = getMachineryFromProduct(product);

		form = {
			name: product.name ?? '',
			description: product.description ?? '',
			price: product.price != null ? String(product.price) : '',
			category: product.category ?? '',
			quantity: product.quantity ?? 1,
			stock_unit: product.stock_unit ?? 'Sacas',
			brand_id: m?.brand_id ?? '',
			type_id: m?.type_id ?? '',
			model: m?.model ?? '',
			serial_number: m?.serial_number ?? '',
			manufacture_year: m?.manufacture_year != null ? String(m.manufacture_year) : '',
			current_horimeter: m?.current_horimeter != null ? String(m.current_horimeter) : '',
			offer_type: m?.offer_type ?? 'aluguel'
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
			errorMessage = 'Informe o título do anúncio.';
			return false;
		}

		const price = Number(form.price);
		if (!Number.isFinite(price) || price <= 0) {
			errorMessage = 'Informe um preço válido.';
			return false;
		}

		if (isMachinery) {
			if (!form.brand_id || !form.type_id || !form.model.trim()) {
				errorMessage = 'Preencha marca, tipo e modelo.';
				return false;
			}
		} else if (!form.category) {
			errorMessage = 'Selecione a categoria do produto.';
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
			price,
			...(isMachinery
				? { category: 'Maquinário', quantity: 1, stock_unit: 'Unidade' }
				: {
						category: form.category,
						quantity: Number(form.quantity) || 1,
						stock_unit: form.stock_unit
					})
		});

		if (productError) {
			errorMessage = 'Não foi possível salvar o anúncio.';
			saving = false;
			return;
		}

		if (isMachinery && machinery?.id) {
			const { error: machineryError } = await updateMachinery(machinery.id, {
				offer_type: form.offer_type,
				brand_id: form.brand_id,
				type_id: form.type_id,
				model: form.model.trim(),
				serial_number: form.serial_number.trim() || null,
				manufacture_year: parseInt(form.manufacture_year, 10),
				current_horimeter: parseFloat(form.current_horimeter)
			});

			if (machineryError) {
				errorMessage = 'Produto salvo, mas falhou ao atualizar detalhes do maquinário.';
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
	title="Editar anúncio"
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
				<label for="edit-name" class="mb-1 block text-sm font-medium text-surface-900-100">Título</label>
				<input
					id="edit-name"
					placeholder="Ex: Trator JD 6100J"
					type="text"
					bind:value={form.name}
					required
					class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			<div>
				<label for="edit-description" class="mb-1 block text-sm font-medium text-surface-900-100"
					>Descrição</label
				>
				<textarea
					id="edit-description"
					placeholder="Ex: estado de conservação, revisões, observações..."
					rows="3"
					bind:value={form.description}
					class="textarea w-full resize-none rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				></textarea>
			</div>

			{#if isMachinery}
				<div>
					<label for="edit-offer-type" class="mb-1 block text-sm font-medium text-surface-900-100">Tipo de negócio</label>
					<select
						id="edit-offer-type"
						bind:value={form.offer_type}
						class="select w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					>
						<option value="aluguel">Aluguel (preço por hora)</option>
						<option value="venda">Venda (preço da máquina)</option>
					</select>
				</div>
			{/if}

			<div>
				<label for="edit-price" class="mb-1 block text-sm font-medium text-surface-900-100">
					{isMachinery && form.offer_type === 'aluguel' ? 'Preço por hora (R$)' : 'Preço (R$)'}
				</label>
				<input
					id="edit-price"
					placeholder="Ex: 500,00"
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
						<label for="edit-type" class="mb-1 block text-sm font-medium text-surface-900-100">Tipo</label>
						<select
							id="edit-type"
							bind:value={form.type_id}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="" disabled>Selecione</option>
							{#each types as type (type.id)}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-brand" class="mb-1 block text-sm font-medium text-surface-900-100">Marca</label>
						<select
							id="edit-brand"
							bind:value={form.brand_id}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="" disabled>Selecione</option>
							{#each brands as brand (brand.id)}
								<option value={brand.id}>{brand.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="edit-model" class="mb-1 block text-sm font-medium text-surface-900-100">Modelo</label>
					<input
						id="edit-model"
						placeholder="Ex: 6100J"
						type="text"
						bind:value={form.model}
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
					/>
				</div>

				<div>
					<label for="edit-serial" class="mb-1 block text-sm font-medium text-surface-900-100"
						>Número de série</label
					>
					<input
						id="edit-serial"
						placeholder="Ex: 123456789ABC"
						type="text"
						bind:value={form.serial_number}
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-year" class="mb-1 block text-sm font-medium text-surface-900-100">Ano</label>
						<input
							id="edit-year"
							placeholder="Ex: 2018"
							type="number"
							min="1950"
							bind:value={form.manufacture_year}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
					<div>
						<label for="edit-horimeter" class="mb-1 block text-sm font-medium text-surface-900-100"
							>Horímetro</label
						>
						<input
							id="edit-horimeter"
							placeholder="Ex: 2500"
							type="number"
							bind:value={form.current_horimeter}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
				</div>
			{:else}
				<div>
					<label for="edit-category" class="mb-1 block text-sm font-medium text-surface-900-100"
						>Categoria</label
					>
					<select
						id="edit-category"
						bind:value={form.category}
						class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
					>
						<option value="" disabled>Selecione</option>
						<option value="Sementes">Sementes</option>
						<option value="Fertilizantes">Fertilizantes</option>
						<option value="Mudas">Mudas</option>
						<option value="Defensivos">Defensivos Agrícolas</option>
						<option value="Insumo">Insumo</option>
						<option value="Outros">Outros</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="edit-qty" class="mb-1 block text-sm font-medium text-surface-900-100"
							>Quantidade</label
						>
						<input
							id="edit-qty"
							placeholder="Ex: 100"
							type="number"
							min="1"
							bind:value={form.quantity}
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500"
						/>
					</div>
					<div>
						<label for="edit-unit" class="mb-1 block text-sm font-medium text-surface-900-100">Unidade</label>
						<select
							id="edit-unit"
							bind:value={form.stock_unit}
							class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
						>
							<option value="Sacas">Sacas</option>
							<option value="Kg">Kg</option>
							<option value="Toneladas">Toneladas</option>
							<option value="Litros">Litros</option>
							<option value="Unidades">Unidades</option>
						</select>
					</div>
				</div>
			{/if}

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
				<span>Cancelar</span>
			</button>
			<button
				type="submit"
				form="inventory-edit-form"
				disabled={saving}
				class="btn btn-lg preset-filled-primary-500 w-full"
			>
				<Check size={18} />
				<span>{saving ? 'Salvando...' : 'Salvar'}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>
