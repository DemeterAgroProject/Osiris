<script>
	import { goto } from '$app/navigation';
	import { X, Send } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';

	function parseCurrencyToNumber(value) {
		if (value === null || value === undefined || value === '') return null;
		const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
		const numeric = Number(normalized);
		return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
	}

	let {
		open = $bindable(false),
		title = 'Anúncio',
		priceLabel = 'Preço a combinar',
		sellerName = 'Anunciante',
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
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
	}

	function validateForm() {
		error = '';
		if (!providerId) {
			error = 'Anunciante indisponível para negociação.';
			return false;
		}
		if (!productId && !serviceId) {
			error = 'Item do anúncio não identificado.';
			return false;
		}
		if (!proposalValue.trim()) {
			error = 'Informe o valor da proposta.';
			return false;
		}
		if (parseCurrencyToNumber(proposalValue) === null) {
			error = 'Informe um valor válido.';
			return false;
		}
		if (requiresDates) {
			if (!startDate || !endDate) {
				error = 'Informe as datas de início e fim.';
				return false;
			}
			if (startDate > endDate) {
				error = 'A data de início deve ser anterior à data de fim.';
				return false;
			}
		}
		if (showQuantity && (!quantity || Number(quantity) <= 0)) {
			error = 'Informe uma quantidade válida.';
			return false;
		}
		if (!message.trim() || message.trim().length < 10) {
			error = 'Escreva uma mensagem com pelo menos 10 caracteres.';
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
			error = 'Faça login para enviar uma proposta.';
			sending = false;
			goto('/login?redirect=' + encodeURIComponent(window.location.pathname));
			return;
		}

		if (user.id === providerId) {
			error = 'Você não pode negociar com o próprio anúncio.';
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
			error = insertError.message || 'Não foi possível enviar a proposta.';
			sending = false;
			return;
		}

		await supabase.from('negotiation_messages').insert({
			negotiation_id: negotiation.id,
			sender_id: user.id,
			content: fullMessage
		});

		sending = false;
		closeModal();
		await goto(`/negociacoes/${negotiation.id}`);
	}
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-[90] border-0 bg-black/50 p-0"
		onclick={closeModal}
		aria-label="Fechar modal"
	></button>

	<div class="fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl bg-white shadow-2xl">
		<div class="mx-auto flex max-h-[88vh] w-full max-w-3xl flex-col px-4 pb-6 pt-4">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-bold text-gray-900">Fazer proposta</h2>
					<p class="text-xs text-gray-500">Envie para {sellerName}</p>
				</div>
				<button
					type="button"
					onclick={closeModal}
					aria-label="Fechar modal"
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="overflow-y-auto pb-2">
					<div class="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
						<p class="line-clamp-1 text-sm font-semibold text-gray-900">{title}</p>
						<p class="text-sm font-bold text-green-700">{priceLabel}</p>
					</div>

					<form class="mt-4 space-y-3" onsubmit={handleSubmit}>
						{#if requiresDates}
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label
										for="startDate"
										class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
									>
										Início
									</label>
									<input
										id="startDate"
										type="date"
										bind:value={startDate}
										class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
									/>
								</div>
								<div>
									<label
										for="endDate"
										class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
									>
										Fim
									</label>
									<input
										id="endDate"
										type="date"
										bind:value={endDate}
										class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
									/>
								</div>
							</div>
						{/if}

						<div>
							<label
								for="proposalValue"
								class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
							>
								Valor proposto
							</label>
							<input
								id="proposalValue"
								type="text"
								bind:value={proposalValue}
								placeholder="R$ 0,00"
								class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
								onblur={() => (proposalValue = formatCurrencyInput(proposalValue))}
							/>
						</div>

						{#if showQuantity}
							<div>
								<label
									for="quantity"
									class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
								>
									Quantidade
								</label>
								<input
									id="quantity"
									type="number"
									min="1"
									step="1"
									bind:value={quantity}
									class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
								/>
							</div>
						{/if}

						<div>
							<label
								for="message"
								class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
							>
								Mensagem
							</label>
							<textarea
								id="message"
								rows="4"
								bind:value={message}
								placeholder="Detalhes da proposta, logística, frete..."
								class="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
							></textarea>
						</div>

						{#if error}
							<p class="text-xs font-medium text-red-600">{error}</p>
						{/if}

						<div class="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white pt-3">
							<button
								type="button"
								onclick={closeModal}
								class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={sending}
								class="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
							>
								{#if sending}
									Enviando...
								{:else}
									<Send class="h-4 w-4" />
									Enviar proposta
								{/if}
							</button>
						</div>
					</form>
			</div>
		</div>
	</div>
{/if}
