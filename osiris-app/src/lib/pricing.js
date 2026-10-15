// Texto do preço de um anúncio. Máquina: venda (valor da máquina) ou aluguel (valor da hora),
// conforme agricultural_machinery.offer_type; serviço segue o modelo de cobrança (valores aceitos
// por services_pricing_model_check); produto é o valor anunciado.

export const MACHINE_OFFER_LABEL = { venda: 'Venda', aluguel: 'Aluguel' };

export function formatCurrency(value) {
	if (value === null || value === undefined || value === '') return 'Preço a combinar';
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

const SERVICE_SUFFIX = { 'Por Hora': ' / hora', 'Por Hectare': ' / ha', 'Empreitada/Fixo': ' (valor fechado)' };

/**
 * @param {'maquinario' | 'produto' | 'servico' | string} tipo
 * @param {number | string | null | undefined} price
 * @param {string | null} [pricingModel] serviço: pricing_model; máquina: offer_type ('venda' | 'aluguel')
 */
export function listingPriceLabel(tipo, price, pricingModel = null) {
	if (price === null || price === undefined || price === '') return 'Preço a combinar';
	if (tipo === 'maquinario') {
		return pricingModel === 'aluguel' ? `${formatCurrency(price)} / hora` : formatCurrency(price);
	}
	if (tipo === 'servico') {
		if (pricingModel === 'A Combinar') return 'Preço a combinar';
		return formatCurrency(price) + (SERVICE_SUFFIX[pricingModel] ?? '');
	}
	return formatCurrency(price);
}
