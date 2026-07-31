<script>
	import { X } from 'lucide-svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { supabase } from '$lib/supabase';

	let { open = $bindable(false), service = null, onsaved = () => {} } = $props();

	let saving = $state(false);
	let errorMessage = $state('');
	let form = $state({
		title: '',
		description: '',
		location: '',
		pricing_model: 'Por Hora',
		price: ''
	});

	function resetForm() {
		if (!service) return;

		form = {
			title: service.title ?? '',
			description: service.description ?? '',
			location: service.location ?? '',
			pricing_model: service.pricing_model ?? 'Por Hora',
			price: service.price != null ? String(service.price) : ''
		};
		errorMessage = '';
	}

	function closeSheet() {
		if (saving) return;
		open = false;
		errorMessage = '';
	}

	function handleOpenChange(details) {
		if (!details.open) closeSheet();
	}

	async function handleSubmit(event) {
		event.preventDefault();
		if (!service?.id) return;

		const title = form.title.trim();
		const description = form.description.trim();
		const location = form.location.trim();

		if (!title || !description || !location) {
			errorMessage = 'Preencha título, descrição e localização.';
			return;
		}

		let finalPrice = null;
		if (form.pricing_model !== 'A Combinar') {
			const parsed = Number(form.price);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				errorMessage = 'Informe um valor válido ou escolha "A Combinar".';
				return;
			}
			finalPrice = parsed;
		}

		saving = true;
		errorMessage = '';

		const { error } = await supabase
			.from('services')
			.update({
				title,
				description,
				location,
				pricing_model: form.pricing_model,
				price: finalPrice
			})
			.eq('id', service.id);

		saving = false;

		if (error) {
			errorMessage = 'Não foi possível salvar o serviço.';
			return;
		}

		closeSheet();
		onsaved();
	}

	$effect(() => {
		if (open && service) resetForm();
	});
</script>

<Dialog {open} onOpenChange={handleOpenChange} closeOnInteractOutside={!saving} closeOnEscape={!saving}>
	{#if open && service}
		<Portal>
			<Dialog.Backdrop class="fixed inset-0 z-[80] bg-surface-950/40" />
			<Dialog.Positioner class="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
				<Dialog.Content class="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-surface-50-950 outline-none sm:max-w-2xl sm:rounded-container sm:border sm:border-surface-200-800">
					<div class="mx-auto flex max-h-[92vh] w-full max-w-2xl flex-col">
			<div class="flex items-center justify-between border-b border-surface-200-800 px-4 py-4">
				<Dialog.Title id="edit-service-title" class="text-lg font-bold text-surface-950-50">Editar serviço</Dialog.Title>
				<button
					type="button"
					onclick={closeSheet}
					class="rounded-full p-2 text-surface-700-300 hover:preset-tonal"
					aria-label="Fechar"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<form class="flex-1 space-y-4 overflow-y-auto px-4 py-4" onsubmit={handleSubmit}>
				{#if errorMessage}
					<div class="rounded-container preset-tonal-error p-3 text-sm text-error-500">{errorMessage}</div>
				{/if}

				<div>
					<label for="edit-service-title-input" class="mb-1 block text-sm font-medium text-surface-700-300"
						>Título</label
					>
					<input
						id="edit-service-title-input"
						type="text"
						bind:value={form.title}
						required
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>

				<div>
					<label for="edit-service-description" class="mb-1 block text-sm font-medium text-surface-700-300"
						>Descrição</label
					>
					<textarea
						id="edit-service-description"
						rows="3"
						bind:value={form.description}
						required
						class="textarea w-full resize-none rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					></textarea>
				</div>

				<div>
					<label for="edit-service-location" class="mb-1 block text-sm font-medium text-surface-700-300"
						>Localização / raio</label
					>
					<input
						id="edit-service-location"
						type="text"
						bind:value={form.location}
						required
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>

				<div>
					<label for="edit-service-pricing" class="mb-1 block text-sm font-medium text-surface-700-300"
						>Formato de cobrança</label
					>
					<select
						id="edit-service-pricing"
						bind:value={form.pricing_model}
						class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
					>
						<option value="Por Hora">Por Hora</option>
						<option value="Por Hectare">Por Hectare</option>
						<option value="Empreitada/Fixo">Empreitada / Fixo</option>
						<option value="A Combinar">A Combinar</option>
					</select>
				</div>

				{#if form.pricing_model !== 'A Combinar'}
					<div>
						<label for="edit-service-price" class="mb-1 block text-sm font-medium text-surface-700-300"
							>Valor (R$)</label
						>
						<input
							id="edit-service-price"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.price}
							required
							class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
						/>
					</div>
				{/if}

				<button
					type="submit"
					disabled={saving}
					class="w-full rounded-container preset-filled-primary-500 py-3.5 text-sm font-semibold disabled:opacity-60"
				>
					{saving ? 'Salvando...' : 'Salvar alterações'}
				</button>
			</form>
					</div>
				</Dialog.Content>
			</Dialog.Positioner>
		</Portal>
	{/if}
</Dialog>
