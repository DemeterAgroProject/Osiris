<script>
	import { X, Send, CircleCheckBig, MessageCircleMore } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = 'Anúncio',
		priceLabel = 'Preço a combinar',
		sellerName = 'Anunciante',
		type = 'produto'
	} = $props();

	let proposalValue = $state('');
	let quantity = $state('1');
	let message = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');

	const showQuantity = $derived(type === 'produto');

	function resetForm() {
		proposalValue = '';
		quantity = '1';
		message = '';
		sending = false;
		sent = false;
		error = '';
	}

	function closeModal() {
		open = false;
		resetForm();
	}

	function formatCurrencyInput(value) {
		const normalized = value.replace(/[^\d,]/g, '').replace(',', '.');
		const numeric = Number(normalized);
		if (!Number.isFinite(numeric) || numeric <= 0) return '';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
	}

	function validateForm() {
		error = '';
		if (!proposalValue.trim()) {
			error = 'Informe o valor da proposta.';
			return false;
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
		await new Promise((resolve) => setTimeout(resolve, 700));
		sending = false;
		sent = true;
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
					<h2 class="text-lg font-bold text-gray-900">Proposta de negociação</h2>
					<p class="text-xs text-gray-500">Envie uma proposta para {sellerName}</p>
				</div>
				<button
					onclick={closeModal}
					aria-label="Fechar modal"
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			{#if sent}
				<div class="flex flex-col items-center rounded-2xl border border-green-100 bg-green-50 px-4 py-8 text-center">
					<CircleCheckBig class="h-10 w-10 text-green-700" />
					<p class="mt-3 text-base font-semibold text-green-800">Proposta enviada (mock)</p>
					<p class="mt-1 text-sm text-green-700">
						O anunciante receberá sua mensagem em breve.
					</p>
					<button
						onclick={closeModal}
						class="mt-5 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"
					>
						Fechar
					</button>
				</div>
			{:else}
				<div class="overflow-y-auto pb-2">
					<div class="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
						<p class="line-clamp-1 text-sm font-semibold text-gray-900">{title}</p>
						<p class="text-sm font-bold text-green-700">{priceLabel}</p>
					</div>

					<form class="mt-4 space-y-3" onsubmit={handleSubmit}>
						<div>
							<label for="proposalValue" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
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
								<label for="quantity" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
									Quantidade
								</label>
								<input
									id="quantity"
									type="number"
									min="1"
									step="1"
									bind:value={quantity}
									placeholder="Ex: 1"
									class="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
								/>
							</div>
						{/if}

						<div>
							<label for="message" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
								Mensagem para o anunciante
							</label>
							<textarea
								id="message"
								rows="5"
								bind:value={message}
								placeholder="Explique sua proposta, prazos e dúvidas..."
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
								class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
							>
								Fechar
							</button>
							<button
								type="submit"
								disabled={sending}
								class="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
							>
								{#if sending}
									Enviando...
								{:else}
									<Send class="h-4 w-4" />
									Solicitar negociação
								{/if}
							</button>
						</div>
					</form>
				</div>
			{/if}
		</div>
	</div>
{/if}
