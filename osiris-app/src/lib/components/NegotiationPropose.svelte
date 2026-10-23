<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Handshake, Send } from 'lucide-svelte';
	import AppDialog from '$lib/components/ui/AppDialog.svelte';
	import { supabase } from '$lib/supabase';
	import { track, trackError } from '$lib/telemetry';
	import { userMessage } from '$lib/errors';
	import { m } from '$lib/paraglide/messages';
	import { formatBRL, intlLocale } from '$lib/i18n';

	// lê o valor digitado no formato do idioma atual ("1.500,00" em português, "1,500.00" em inglês)
	function parseCurrencyToNumber(value) {
		if (value === null || value === undefined || value === '') return null;
		const decimal = (1.1).toLocaleString(intlLocale()).charAt(1);
		const normalized = String(value)
			.replace(new RegExp(`[^\\d${decimal === ',' ? ',' : '.'}-]`, 'g'), '')
			.replace(',', '.');
		const numeric = Number(normalized);
		return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
	}

	let {
		open = $bindable(false),
		title = m.negociacao_anuncio(),
		priceLabel = m.comum_preco_a_combinar(),
		sellerName = m.negociacao_anunciante(),
		type = 'produto',
		providerId = null,
		productId = null,
		serviceId = null
	} = $props();

	let proposalValue = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let quantity = $state('1');
	let message = $state('');
	let sending = $state(false);
	let error = $state('');

	const requiresDates = $derived(type === 'maquinario' || type === 'servico');
	const showQuantity = $derived(type === 'produto');

	function resetForm() {
		proposalValue = '';
		startDate = '';
		endDate = '';
		quantity = '1';
		message = '';
		sending = false;
		error = '';
	}

	function closeModal() {
		open = false;
		resetForm();
	}

	function formatCurrencyInput(value) {
		const numeric = parseCurrencyToNumber(value);
		if (numeric === null) return '';
		return formatBRL(numeric);
	}

	function validateForm() {
		error = '';
		if (!providerId) {
			error = m.negociacao_erro_anunciante_indisponivel();
			return false;
		}
		if (!productId && !serviceId) {
			error = m.negociacao_erro_item_nao_identificado();
			return false;
		}
		if (!proposalValue.trim()) {
			error = m.negociacao_erro_informe_valor();
			return false;
		}
		if (parseCurrencyToNumber(proposalValue) === null) {
			error = m.negociacao_erro_valor_invalido();
			return false;
		}
		if (requiresDates) {
			if (!startDate || !endDate) {
				error = m.negociacao_erro_informe_datas();
				return false;
			}
			if (startDate > endDate) {
				error = m.negociacao_erro_ordem_datas();
				return false;
			}
		}
		if (showQuantity && (!quantity || Number(quantity) <= 0)) {
			error = m.negociacao_erro_quantidade();
			return false;
		}
		if (!message.trim() || message.trim().length < 10) {
			error = m.negociacao_erro_mensagem_curta();
			return false;
		}
		return true;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		if (!validateForm()) return;

		sending = true;
		error = '';

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			error = m.negociacao_erro_login();
			sending = false;
			goto(resolve('/login?redirect=' + encodeURIComponent(window.location.pathname)));
			return;
		}

		if (user.id === providerId) {
			error = m.negociacao_erro_proprio_anuncio();
			sending = false;
			return;
		}

		const proposedPrice = parseCurrencyToNumber(proposalValue);
		const fullMessage = showQuantity
			? `${message.trim()}\n\nQuantidade solicitada: ${quantity}`
			: message.trim();

		const payload = {
			client_id: user.id,
			provider_id: providerId,
			product_id: productId || null,
			service_id: serviceId || null,
			proposed_start_date: requiresDates ? startDate : null,
			proposed_end_date: requiresDates ? endDate : null,
			proposed_price: proposedPrice,
			message: fullMessage
		};

		const { data: negotiation, error: insertError } = await supabase
			.from('negotiations')
			.insert(payload)
			.select('id')
			.single();

		if (insertError) {
			trackError('proposta_falhou', insertError);
			error = userMessage(insertError, m.negociacao_erro_enviar_proposta());
			sending = false;
			return;
		}

		await supabase.from('negotiation_messages').insert({
			negotiation_id: negotiation.id,
			sender_id: user.id,
			content: fullMessage
		});

		track('proposta_enviada', { alvo: serviceId ? 'servico' : 'produto', com_datas: Boolean(requiresDates) });
		sending = false;
		closeModal();
		await goto(resolve(`/negociacoes/${negotiation.id}`));
	}
</script>

<AppDialog
	bind:open
	title={m.negociacao_fazer_proposta()}
	description={m.negociacao_envie_para({ nome: sellerName })}
	variant="sheet"
	size="md"
	dismissible={!sending}
	onclose={resetForm}
>
	<div class="flex items-center gap-3 rounded-container border border-primary-500/20 bg-primary-500/5 px-4 py-3">
		<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-container preset-tonal-primary">
			<Handshake size={22} />
		</span>
		<div class="min-w-0">
			<p class="line-clamp-2 preset-typo-card-title">{title}</p>
			<p class="text-base font-bold text-primary-700-300">{priceLabel}</p>
		</div>
	</div>

	<form id="negotiation-propose-form" class="mt-5 space-y-4" onsubmit={handleSubmit}>
		{#if requiresDates}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label
						for="startDate"
						class="mb-1.5 block text-sm font-semibold text-surface-950-50"
					>
						{m.negociacao_data_inicio()}
					</label>
					<input
						id="startDate"
						type="date"
						bind:value={startDate}
						class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>
				<div>
					<label
						for="endDate"
						class="mb-1.5 block text-sm font-semibold text-surface-950-50"
					>
						{m.negociacao_data_fim()}
					</label>
					<input
						id="endDate"
						type="date"
						bind:value={endDate}
						class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
				</div>
			</div>
		{/if}

		<div>
			<label
				for="proposalValue"
				class="mb-1.5 block text-sm font-semibold text-surface-950-50"
			>
				{m.negociacao_valor_proposto()}
			</label>
			<input
				id="proposalValue"
				type="text"
				bind:value={proposalValue}
				placeholder={m.negociacao_valor_placeholder()}
				class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				onblur={() => (proposalValue = formatCurrencyInput(proposalValue))}
			/>
		</div>

		{#if showQuantity}
			<div>
				<label
					for="quantity"
					class="mb-1.5 block text-sm font-semibold text-surface-950-50"
				>
					{m.negociacao_quantidade()}
				</label>
				<input
					id="quantity"
					type="number"
					min="1"
					step="1"
					bind:value={quantity}
					class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>
		{/if}

		<div>
			<label
				for="message"
				class="mb-1.5 block text-sm font-semibold text-surface-950-50"
			>
				{m.negociacao_mensagem()}
			</label>
			<textarea
				id="message"
				rows="4"
				bind:value={message}
				placeholder={m.negociacao_mensagem_placeholder()}
				class="textarea w-full resize-none rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-3 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			></textarea>
		</div>

		{#if error}
			<p class="text-xs font-medium text-error-500">{error}</p>
		{/if}
	</form>

	{#snippet footer()}
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={closeModal}
				disabled={sending}
				class="btn btn-lg preset-tonal w-full"
			>
				<span>{m.comum_cancelar()}</span>
			</button>
			<button
				type="submit"
				form="negotiation-propose-form"
				disabled={sending}
				class="btn btn-lg preset-filled-primary-500 w-full"
			>
				<Send size={18} />
				<span>{sending ? m.negociacao_enviando() : m.negociacao_enviar_proposta()}</span>
			</button>
		</div>
	{/snippet}
</AppDialog>
