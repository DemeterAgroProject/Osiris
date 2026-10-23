// Texto do preço de um anúncio.
// Máquina: venda (valor da máquina) ou aluguel (valor por hora, dia ou hectare), conforme
// agricultural_machinery.offer_type e rental_unit. Serviço: modelo de cobrança (valores aceitos por
// services_pricing_model_check). Produto: valor por unidade de estoque (products.stock_unit).
//
// Os valores gravados no banco ficam em português; aqui só se traduz a exibição. Os mapas de rótulo
// usam getters (e os mapas internos guardam a função m.x): a mensagem é lida na hora do acesso, no
// idioma atual, nunca congelada no carregamento do módulo.
import { m } from '$lib/paraglide/messages';
import { formatBRL } from '$lib/i18n';

export const MACHINE_OFFER_LABEL = {
	get venda() {
		return m.anunciar_oferta_venda();
	},
	get aluguel() {
		return m.anunciar_oferta_aluguel();
	}
};

export const MACHINE_CONDITION_LABEL = {
	get nova() {
		return m.anunciar_condicao_nova();
	},
	get seminova() {
		return m.anunciar_condicao_seminova();
	},
	get usada() {
		return m.anunciar_condicao_usada();
	}
};

export const RENTAL_UNIT_LABEL = {
	get hora() {
		return m.anunciar_cobranca_hora();
	},
	get dia() {
		return m.anunciar_cobranca_dia();
	},
	get hectare() {
		return m.anunciar_cobranca_hectare();
	}
};

export const DELIVERY_LABEL = {
	get retirada() {
		return m.anunciar_entrega_retirada();
	},
	get entrega() {
		return m.anunciar_entrega_regiao();
	},
	get a_combinar() {
		return m.anunciar_entrega_a_combinar();
	}
};

const RENTAL_SUFFIX = { hora: m.anunciar_sufixo_hora, dia: m.anunciar_sufixo_dia, hectare: m.anunciar_sufixo_ha };

const SERVICE_SUFFIX = {
	'Por Hora': m.anunciar_sufixo_hora,
	'Por Hectare': m.anunciar_sufixo_ha,
	'Empreitada/Fixo': m.anunciar_sufixo_valor_fechado
};

// unidade de estoque (plural, como no formulário e no banco) -> [singular, plural]
const STOCK_UNIT_WORDS = {
	Sacas: [m.anunciar_un_saca, m.anunciar_un_sacas],
	Kg: [() => 'kg', () => 'kg'],
	Toneladas: [m.anunciar_un_tonelada, m.anunciar_un_toneladas],
	Litros: [m.anunciar_un_litro, m.anunciar_un_litros],
	Unidades: [m.anunciar_un_unidade, m.anunciar_un_unidades],
	Unidade: [m.anunciar_un_unidade, m.anunciar_un_unidades]
};

// unidades que levam "/ saca" no preço (a "Unidade" das máquinas não leva)
const PRICED_STOCK_UNITS = ['Sacas', 'Kg', 'Toneladas', 'Litros', 'Unidades'];

/** "Sacas" -> "saca" / "sacas" (no idioma atual): para "pedido mínimo de 10 sacas" e afins. */
export function stockUnitLabel(stockUnit, amount = 2) {
	if (!stockUnit) return '';
	const words = STOCK_UNIT_WORDS[stockUnit];
	if (!words) return stockUnit.toLowerCase();
	return Number(amount) === 1 ? words[0]() : words[1]();
}

/** Nome da unidade de estoque para listas e selects ("Sacas", "Bags", "Kg"). */
export function stockUnitName(stockUnit) {
	if (!stockUnit) return '';
	if (stockUnit === 'Kg') return 'Kg';
	if (!STOCK_UNIT_WORDS[stockUnit]) return stockUnit;
	const plural = stockUnitLabel(stockUnit, 2);
	return plural.charAt(0).toUpperCase() + plural.slice(1);
}

// products.category -> rótulo (insumos e a categoria "Maquinário" das máquinas)
const CATEGORY_LABEL = {
	Maquinário: m.anunciar_cat_maquinario,
	Sementes: m.anunciar_cat_sementes,
	Fertilizantes: m.anunciar_cat_fertilizantes,
	Mudas: m.anunciar_cat_mudas,
	Defensivos: m.anunciar_cat_defensivos,
	Corretivos: m.anunciar_cat_corretivos,
	Grãos: m.anunciar_cat_graos,
	'Nutrição animal': m.anunciar_cat_nutricao_animal,
	Peças: m.anunciar_cat_pecas,
	Insumo: m.anunciar_cat_insumo,
	Outros: m.anunciar_cat_outros
};

// machinery_types.name -> rótulo
const MACHINE_TYPE_LABEL = {
	Caminhão: m.anunciar_tipo_caminhao,
	'Carreta graneleira': m.anunciar_tipo_carreta_graneleira,
	Colheitadeira: m.anunciar_tipo_colheitadeira,
	'Distribuidor de adubo': m.anunciar_tipo_distribuidor_adubo,
	'Drone agrícola': m.anunciar_tipo_drone,
	Enfardadeira: m.anunciar_tipo_enfardadeira,
	Escavadeira: m.anunciar_tipo_escavadeira,
	Grade: m.anunciar_tipo_grade,
	Outro: m.anunciar_tipo_outro,
	'Pá carregadeira': m.anunciar_tipo_pa_carregadeira,
	Plantadeira: m.anunciar_tipo_plantadeira,
	Pulverizador: m.anunciar_tipo_pulverizador,
	Roçadeira: m.anunciar_tipo_rocadeira,
	Semeadora: m.anunciar_tipo_semeadora,
	Trator: m.anunciar_tipo_trator
};

// services.service_type -> rótulo
const SERVICE_TYPE_LABEL = {
	'Mão de Obra': m.anunciar_servico_mao_de_obra,
	'Pacote Completo': m.anunciar_servico_pacote_completo
};

// services.pricing_model -> rótulo
const PRICING_MODEL_LABEL = {
	'Por Hora': m.anunciar_modelo_por_hora,
	'Por Hectare': m.anunciar_modelo_por_hectare,
	'Empreitada/Fixo': m.anunciar_modelo_empreitada,
	'A Combinar': m.anunciar_modelo_a_combinar
};

const TRACTION_LABEL = { esteira: m.anunciar_tracao_esteira };

/** products.category no idioma atual (anúncios antigos com o tipo da máquina como categoria também). */
export function categoryLabel(value) {
	if (!value) return '';
	return (CATEGORY_LABEL[value] ?? MACHINE_TYPE_LABEL[value])?.() ?? value;
}

/** machinery_types.name no idioma atual. */
export function machineTypeLabel(value) {
	if (!value) return '';
	return MACHINE_TYPE_LABEL[value]?.() ?? value;
}

/** services.service_type ('Mão de Obra', 'Pacote Completo') no idioma atual. */
export function serviceTypeLabel(value) {
	if (!value) return '';
	return SERVICE_TYPE_LABEL[value]?.() ?? value;
}

/** services.pricing_model ('Por Hora', 'Por Hectare', 'Empreitada/Fixo', 'A Combinar') no idioma atual. */
export function pricingModelLabel(value) {
	if (!value) return '';
	return PRICING_MODEL_LABEL[value]?.() ?? value;
}

/** agricultural_machinery.traction ('4x2', '4x4', 'esteira') no idioma atual. */
export function tractionLabel(value) {
	if (!value) return '';
	return TRACTION_LABEL[value]?.() ?? value;
}

/** Sufixo do preço da máquina alugada: "/ hora", "/ dia", "/ ha" (padrão: hora). */
export function rentalUnitSuffix(unit) {
	return (RENTAL_SUFFIX[unit] ?? RENTAL_SUFFIX.hora)();
}

export function formatCurrency(value) {
	if (value === null || value === undefined || value === '') return m.comum_preco_a_combinar();
	return formatBRL(value);
}

/**
 * @param {'maquinario' | 'produto' | 'servico' | string} tipo
 * @param {number | string | null | undefined} price
 * @param {string | null} [pricingModel] serviço: pricing_model; máquina: offer_type ('venda' | 'aluguel')
 * @param {string | null} [unit] máquina alugada: rental_unit ('hora' | 'dia' | 'hectare'); produto: stock_unit
 */
export function listingPriceLabel(tipo, price, pricingModel = null, unit = null) {
	if (price === null || price === undefined || price === '') return m.comum_preco_a_combinar();
	if (tipo === 'maquinario') {
		return pricingModel === 'aluguel'
			? `${formatCurrency(price)} ${rentalUnitSuffix(unit)}`
			: formatCurrency(price);
	}
	if (tipo === 'servico') {
		if (pricingModel === 'A Combinar') return m.comum_preco_a_combinar();
		const suffix = SERVICE_SUFFIX[pricingModel];
		return suffix ? `${formatCurrency(price)} ${suffix()}` : formatCurrency(price);
	}
	return PRICED_STOCK_UNITS.includes(unit)
		? `${formatCurrency(price)} / ${stockUnitLabel(unit, 1)}`
		: formatCurrency(price);
}
