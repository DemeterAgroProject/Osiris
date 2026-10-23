<script>
	import { Check } from 'lucide-svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { supabase } from '$lib/supabase';
	import { pricingModelLabel } from '$lib/pricing';
	import { formatNumber } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	// valores aceitos por services_pricing_model_check (o texto visível vem de pricingModelLabel)
	const PRICING_MODELS = ['Por Hora', 'Por Hectare', 'Empreitada/Fixo', 'A Combinar'];

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
			errorMessage = m.anunciar_servico_erro_campos();
			return;
		}

		let finalPrice = null;
		if (form.pricing_model !== 'A Combinar') {
			const parsed = Number(form.price);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				errorMessage = m.anunciar_servico_valor_invalido({ a_combinar: pricingModelLabel('A Combinar') });
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
			errorMessage = m.anunciar_servico_erro_salvar();
			return;
		}

		closeSheet();
		onsaved();
	}

	$effect(() => {
		if (open && service) resetForm();
	});
</script>

<AppDialog
	bind:open
	title={m.anunciar_servico_editar()}
	variant="sheet"
	size="md"
	dismissible={!saving}
	onclose={closeSheet}
>
	{#if service}
		<form id="service-edit-form" class="space-y-4" onsubmit={handleSubmit}>
			{#if errorMessage}
				<div class="rounded-container preset-tonal-error p-3 text-sm text-error-500">{errorMessage}</div>
			{/if}

			<div>
				<label for="edit-service-title-input" class="mb-1 block text-sm font-medium text-surface-900-100"
					>{m.anunciar_titulo()}</label
				>
				<input
					id="edit-service-title-input"
					placeholder={m.anunciar_servico_ph_titulo_mao()}
					type="text"
					bind:value={form.title}
					required
					class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			<div>
				<label for="edit-service-description" class="mb-1 block text-sm font-medium text-surface-900-100"
					>{m.anunciar_descricao()}</label
				>
				<textarea
					id="edit-service-description"
					placeholder={m.anunciar_servico_ph_descricao_curta()}
					rows="3"
					bind:value={form.description}
					required
					class="textarea w-full resize-none rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				></textarea>
			</div>

			<div>
				<label for="edit-service-location" class="mb-1 block text-sm font-medium text-surface-900-100"
					>{m.anunciar_servico_localizacao()}</label
				>
				<input
					id="edit-service-location"
					placeholder={m.anunciar_servico_ph_localizacao()}
					type="text"
					bind:value={form.location}
					required
					class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			<div>
				<label for="edit-service-pricing" class="mb-1 block text-sm font-medium text-surface-900-100"
					>{m.anunciar_formato_cobranca()}</label
				>
				<select
					id="edit-service-pricing"
					bind:value={form.pricing_model}
					class="select w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-sm outline-none focus:border-primary-500"
				>
					{#each PRICING_MODELS as value (value)}
						<option {value}>{pricingModelLabel(value)}</option>
					{/each}
				</select>
			</div>

			{#if form.pricing_model !== 'A Combinar'}
				<div>
					<label for="edit-service-price" class="mb-1 block text-sm font-medium text-surface-900-100"
						>{m.anunciar_valor_rs()}</label
					>
					<input
						id="edit-service-price"
						placeholder={m.anunciar_exemplo({ valor: formatNumber(150, { minimumFractionDigits: 2 }) })}
						type="number"
						min="0"
						step="0.01"
						bind:value={form.price}
						required
						class="input w-full rounded-container border border-surface-200-800 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>
			{/if}
		</form>
	{/if}

	{#snippet footer()}
		<button
			type="submit"
			form="service-edit-form"
			disabled={saving}
			class="btn btn-lg preset-filled-primary-500 w-full"
		>
			<Check size={18} />
			<span>{saving ? m.comum_salvando() : m.anunciar_salvar_alteracoes()}</span>
		</button>
	{/snippet}
</AppDialog>
