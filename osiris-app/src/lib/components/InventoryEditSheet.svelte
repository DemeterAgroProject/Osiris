<script>
	import { X } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';

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
		current_horimeter: ''
	});

	const isMachinery = $derived(product ? isMachineryProduct(product) : false);
	const machinery = $derived(product ? getMachineryFromProduct(product) : null);

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
			current_horimeter: m?.current_horimeter != null ? String(m.current_horimeter) : ''
		};
		errorMessage = '';
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

		saving = false;
		closeSheet();
		onsaved();
	}

	$effect(() => {
		if (open && product) resetForm();
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') closeSheet();
	}}
/>

{#if open && product}
	<button
		type="button"
		class="fixed inset-0 z-[80] border-0 bg-black/40 p-0"
		onclick={closeSheet}
		aria-label="Fechar edição"
	></button>

	<div
		class="fixed inset-x-0 bottom-0 z-[90] max-h-[92vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-ad-title"
	>
		<div class="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col">
			<div class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
				<h2 id="edit-ad-title" class="text-lg font-bold text-gray-900">Editar anúncio</h2>
				<button
					type="button"
					onclick={closeSheet}
					class="rounded-full p-2 text-gray-400 hover:bg-gray-100"
					aria-label="Fechar"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<form class="flex-1 space-y-4 overflow-y-auto px-4 py-4" onsubmit={handleSubmit}>
				{#if errorMessage}
					<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
				{/if}

				<div>
					<label for="edit-name" class="mb-1 block text-sm font-medium text-gray-700">Título</label>
					<input
						id="edit-name"
						type="text"
						bind:value={form.name}
						required
						class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					/>
				</div>

				<div>
					<label for="edit-description" class="mb-1 block text-sm font-medium text-gray-700"
						>Descrição</label
					>
					<textarea
						id="edit-description"
						rows="3"
						bind:value={form.description}
						class="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					></textarea>
				</div>

				<div>
					<label for="edit-price" class="mb-1 block text-sm font-medium text-gray-700">
						{isMachinery ? 'Preço por hora (R$)' : 'Preço (R$)'}
					</label>
					<input
						id="edit-price"
						type="number"
						min="0"
						step="0.01"
						bind:value={form.price}
						required
						class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					/>
				</div>

				{#if isMachinery}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="edit-type" class="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
							<select
								id="edit-type"
								bind:value={form.type_id}
								class="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
							>
								<option value="" disabled>Selecione</option>
								{#each types as type (type.id)}
									<option value={type.id}>{type.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="edit-brand" class="mb-1 block text-sm font-medium text-gray-700">Marca</label>
							<select
								id="edit-brand"
								bind:value={form.brand_id}
								class="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
							>
								<option value="" disabled>Selecione</option>
								{#each brands as brand (brand.id)}
									<option value={brand.id}>{brand.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label for="edit-model" class="mb-1 block text-sm font-medium text-gray-700">Modelo</label>
						<input
							id="edit-model"
							type="text"
							bind:value={form.model}
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
						/>
					</div>

					<div>
						<label for="edit-serial" class="mb-1 block text-sm font-medium text-gray-700"
							>Número de série</label
						>
						<input
							id="edit-serial"
							type="text"
							bind:value={form.serial_number}
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="edit-year" class="mb-1 block text-sm font-medium text-gray-700">Ano</label>
							<input
								id="edit-year"
								type="number"
								min="1950"
								bind:value={form.manufacture_year}
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
							/>
						</div>
						<div>
							<label for="edit-horimeter" class="mb-1 block text-sm font-medium text-gray-700"
								>Horímetro</label
							>
							<input
								id="edit-horimeter"
								type="number"
								bind:value={form.current_horimeter}
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
							/>
						</div>
					</div>
				{:else}
					<div>
						<label for="edit-category" class="mb-1 block text-sm font-medium text-gray-700"
							>Categoria</label
						>
						<select
							id="edit-category"
							bind:value={form.category}
							class="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
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
							<label for="edit-qty" class="mb-1 block text-sm font-medium text-gray-700"
								>Quantidade</label
							>
							<input
								id="edit-qty"
								type="number"
								min="1"
								bind:value={form.quantity}
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
							/>
						</div>
						<div>
							<label for="edit-unit" class="mb-1 block text-sm font-medium text-gray-700">Unidade</label>
							<select
								id="edit-unit"
								bind:value={form.stock_unit}
								class="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
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

				<div class="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white pb-4 pt-3">
					<button
						type="button"
						onclick={closeSheet}
						class="rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={saving}
						class="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
					>
						{saving ? 'Salvando...' : 'Salvar alterações'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
