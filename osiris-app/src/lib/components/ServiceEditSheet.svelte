<script>
	import { X } from 'lucide-svelte';
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

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') closeSheet();
	}}
/>

{#if open && service}
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
		aria-labelledby="edit-service-title"
	>
		<div class="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col">
			<div class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
				<h2 id="edit-service-title" class="text-lg font-bold text-gray-900">Editar serviço</h2>
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
					<label for="edit-service-title-input" class="mb-1 block text-sm font-medium text-gray-700"
						>Título</label
					>
					<input
						id="edit-service-title-input"
						type="text"
						bind:value={form.title}
						required
						class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					/>
				</div>

				<div>
					<label for="edit-service-description" class="mb-1 block text-sm font-medium text-gray-700"
						>Descrição</label
					>
					<textarea
						id="edit-service-description"
						rows="3"
						bind:value={form.description}
						required
						class="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					></textarea>
				</div>

				<div>
					<label for="edit-service-location" class="mb-1 block text-sm font-medium text-gray-700"
						>Localização / raio</label
					>
					<input
						id="edit-service-location"
						type="text"
						bind:value={form.location}
						required
						class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
					/>
				</div>

				<div>
					<label for="edit-service-pricing" class="mb-1 block text-sm font-medium text-gray-700"
						>Formato de cobrança</label
					>
					<select
						id="edit-service-pricing"
						bind:value={form.pricing_model}
						class="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
					>
						<option value="Por Hora">Por Hora</option>
						<option value="Por Hectare">Por Hectare</option>
						<option value="Empreitada/Fixo">Empreitada / Fixo</option>
						<option value="A Combinar">A Combinar</option>
					</select>
				</div>

				{#if form.pricing_model !== 'A Combinar'}
					<div>
						<label for="edit-service-price" class="mb-1 block text-sm font-medium text-gray-700"
							>Valor (R$)</label
						>
						<input
							id="edit-service-price"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.price}
							required
							class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
					</div>
				{/if}

				<button
					type="submit"
					disabled={saving}
					class="w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
				>
					{saving ? 'Salvando...' : 'Salvar alterações'}
				</button>
			</form>
		</div>
	</div>
{/if}
