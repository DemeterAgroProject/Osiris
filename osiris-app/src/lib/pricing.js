// Texto do preço de um anúncio.
// Máquina: venda (valor da máquina) ou aluguel (valor por hora, dia ou hectare), conforme
// agricultural_machinery.offer_type e rental_unit. Serviço: modelo de cobrança (valores aceitos por
// services_pricing_model_check). Produto: valor por unidade de estoque (products.stock_unit).

export const MACHINE_OFFER_LABEL = { venda: 'Venda', aluguel: 'Aluguel' };

export const MACHINE_CONDITION_LABEL = { nova: 'Nova', seminova: 'Seminova', usada: 'Usada' };

export const RENTAL_UNIT_LABEL = { hora: 'Por hora', dia: 'Por dia', hectare: 'Por hectare' };

export const DELIVERY_LABEL = {
	retirada: 'Retirada no local',
	entrega: 'Entrega na região',
	a_combinar: 'A combinar'
};

const RENTAL_SUFFIX = { hora: ' / hora', dia: ' / dia', hectare: ' / ha' };

const SERVICE_SUFFIX = { 'Por Hora': ' / hora', 'Por Hectare': ' / ha', 'Empreitada/Fixo': ' (valor fechado)' };

// unidade de estoque (plural, como no formulário) -> unidade do preço
const STOCK_UNIT_SUFFIX = {
	Sacas: ' / saca',
	Kg: ' / kg',
	Toneladas: ' / tonelada',
	Litros: ' / litro',
	Unidades: ' / unidade'
};

/** "Sacas" -> "saca": para "pedido mínimo de 10 sacas" e afins. */
export function stockUnitLabel(stockUnit, amount = 2) {
	if (!stockUnit) return '';
	const singular = (STOCK_UNIT_SUFFIX[stockUnit] ?? '').replace(' / ', '');
	if (Number(amount) === 1 && singular) return singular;
	return stockUnit === 'Kg' ? 'kg' : stockUnit.toLowerCase();
}

export function formatCurrency(value) {
	if (value === null || value === undefined || value === '') return 'Preço a combinar';
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

/**
 * @param {'maquinario' | 'produto' | 'servico' | string} tipo
 * @param {number | string | null | undefined} price
 * @param {string | null} [pricingModel] serviço: pricing_model; máquina: offer_type ('venda' | 'aluguel')
 * @param {string | null} [unit] máquina alugada: rental_unit ('hora' | 'dia' | 'hectare'); produto: stock_unit
 */
export function listingPriceLabel(tipo, price, pricingModel = null, unit = null) {
	if (price === null || price === undefined || price === '') return 'Preço a combinar';
	if (tipo === 'maquinario') {
		return pricingModel === 'aluguel'
			? formatCurrency(price) + (RENTAL_SUFFIX[unit] ?? RENTAL_SUFFIX.hora)
			: formatCurrency(price);
	}
	if (tipo === 'servico') {
		if (pricingModel === 'A Combinar') return 'Preço a combinar';
		return formatCurrency(price) + (SERVICE_SUFFIX[pricingModel] ?? '');
	}
	return formatCurrency(price) + (STOCK_UNIT_SUFFIX[unit] ?? '');
}
