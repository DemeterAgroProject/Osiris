// Conteúdo da central de ajuda (/ajuda). Cada artigo segue o mesmo roteiro:
// para que serve, onde fica no app, passo a passo e observações.
// Os textos ficam em messages/partes/ajuda.json. Aqui o módulo guarda só as funções das mensagens
// (m.ajuda_*), chamadas por getHelpSections() / getHelpArticles() na hora, no idioma atual.

import { Sprout, Search, Megaphone, MessageSquare, Tractor, ShieldCheck } from 'lucide-svelte';
import { m } from '$lib/paraglide/messages';

/**
 * @typedef {{ label: string, text: string, href?: string }} HelpPlace
 * @typedef {{
 *   slug: string,
 *   section: string,
 *   title: string,
 *   summary: string,
 *   objetivo: string,
 *   onde: HelpPlace[],
 *   passos: string[],
 *   notas: string[]
 * }} HelpArticle
 * @typedef {{ id: string, title: string, icon: typeof Sprout }} HelpSection
 */

const SECTIONS = [
	{ id: 'comecar', title: m.ajuda_secao_comecar, icon: Sprout },
	{ id: 'encontrar', title: m.ajuda_secao_encontrar, icon: Search },
	{ id: 'anunciar', title: m.ajuda_secao_anunciar, icon: Megaphone },
	{ id: 'negociar', title: m.ajuda_secao_negociar, icon: MessageSquare },
	{ id: 'operacao', title: m.ajuda_secao_operacao, icon: Tractor },
	{ id: 'conta', title: m.ajuda_secao_conta, icon: ShieldCheck }
];

const ARTICLES = [
	{
		slug: 'como-funciona',
		section: 'comecar',
		title: m.ajuda_como_funciona_titulo,
		summary: m.ajuda_como_funciona_resumo,
		objetivo: m.ajuda_como_funciona_objetivo,
		onde: [
			{ label: m.ajuda_como_funciona_onde_1_rotulo, text: m.ajuda_como_funciona_onde_1_texto, href: '/' },
			{ label: m.ajuda_como_funciona_onde_2_rotulo, text: m.ajuda_como_funciona_onde_2_texto, href: '/boas-vindas' }
		],
		passos: [
			m.ajuda_como_funciona_passo_1,
			m.ajuda_como_funciona_passo_2,
			m.ajuda_como_funciona_passo_3,
			m.ajuda_como_funciona_passo_4,
			m.ajuda_como_funciona_passo_5
		],
		notas: [
			m.ajuda_como_funciona_nota_1,
			m.ajuda_como_funciona_nota_2
		]
	},
	{
		slug: 'entrar-e-perfil',
		section: 'comecar',
		title: m.ajuda_entrar_e_perfil_titulo,
		summary: m.ajuda_entrar_e_perfil_resumo,
		objetivo: m.ajuda_entrar_e_perfil_objetivo,
		onde: [
			{ label: m.ajuda_entrar_e_perfil_onde_1_rotulo, text: m.ajuda_entrar_e_perfil_onde_1_texto, href: '/login' },
			{ label: m.ajuda_entrar_e_perfil_onde_2_rotulo, text: m.ajuda_entrar_e_perfil_onde_2_texto, href: '/mais' }
		],
		passos: [
			m.ajuda_entrar_e_perfil_passo_1,
			m.ajuda_entrar_e_perfil_passo_2,
			m.ajuda_entrar_e_perfil_passo_3,
			m.ajuda_entrar_e_perfil_passo_4
		],
		notas: [
			m.ajuda_entrar_e_perfil_nota_1,
			m.ajuda_entrar_e_perfil_nota_2
		]
	},
	{
		slug: 'instalar-e-avisos',
		section: 'comecar',
		title: m.ajuda_instalar_e_avisos_titulo,
		summary: m.ajuda_instalar_e_avisos_resumo,
		objetivo: m.ajuda_instalar_e_avisos_objetivo,
		onde: [
			{ label: m.ajuda_instalar_e_avisos_onde_1_rotulo, text: m.ajuda_instalar_e_avisos_onde_1_texto },
			{ label: m.ajuda_instalar_e_avisos_onde_2_rotulo, text: m.ajuda_instalar_e_avisos_onde_2_texto }
		],
		passos: [
			m.ajuda_instalar_e_avisos_passo_1,
			m.ajuda_instalar_e_avisos_passo_2,
			m.ajuda_instalar_e_avisos_passo_3,
			m.ajuda_instalar_e_avisos_passo_4
		],
		notas: [
			m.ajuda_instalar_e_avisos_nota_1,
			m.ajuda_instalar_e_avisos_nota_2
		]
	},
	{
		slug: 'buscar-e-filtrar',
		section: 'encontrar',
		title: m.ajuda_buscar_e_filtrar_titulo,
		summary: m.ajuda_buscar_e_filtrar_resumo,
		objetivo: m.ajuda_buscar_e_filtrar_objetivo,
		onde: [
			{ label: m.ajuda_buscar_e_filtrar_onde_1_rotulo, text: m.ajuda_buscar_e_filtrar_onde_1_texto, href: '/buscar' },
			{ label: m.ajuda_buscar_e_filtrar_onde_2_rotulo, text: m.ajuda_buscar_e_filtrar_onde_2_texto, href: '/' }
		],
		passos: [
			m.ajuda_buscar_e_filtrar_passo_1,
			m.ajuda_buscar_e_filtrar_passo_2,
			m.ajuda_buscar_e_filtrar_passo_3,
			m.ajuda_buscar_e_filtrar_passo_4,
			m.ajuda_buscar_e_filtrar_passo_5
		],
		notas: [
			m.ajuda_buscar_e_filtrar_nota_1,
			m.ajuda_buscar_e_filtrar_nota_2
		]
	},
	{
		slug: 'favoritos',
		section: 'encontrar',
		title: m.ajuda_favoritos_titulo,
		summary: m.ajuda_favoritos_resumo,
		objetivo: m.ajuda_favoritos_objetivo,
		onde: [
			{ label: m.ajuda_favoritos_onde_1_rotulo, text: m.ajuda_favoritos_onde_1_texto },
			{ label: m.ajuda_favoritos_onde_2_rotulo, text: m.ajuda_favoritos_onde_2_texto, href: '/favoritos' }
		],
		passos: [
			m.ajuda_favoritos_passo_1,
			m.ajuda_favoritos_passo_2,
			m.ajuda_favoritos_passo_3
		],
		notas: [
			m.ajuda_favoritos_nota_1
		]
	},
	{
		slug: 'anunciar-maquina',
		section: 'anunciar',
		title: m.ajuda_anunciar_maquina_titulo,
		summary: m.ajuda_anunciar_maquina_resumo,
		objetivo: m.ajuda_anunciar_maquina_objetivo,
		onde: [
			{ label: m.ajuda_anunciar_maquina_onde_1_rotulo, text: m.ajuda_anunciar_maquina_onde_1_texto, href: '/anunciar' }
		],
		passos: [
			m.ajuda_anunciar_maquina_passo_1,
			m.ajuda_anunciar_maquina_passo_2,
			m.ajuda_anunciar_maquina_passo_3,
			m.ajuda_anunciar_maquina_passo_4,
			m.ajuda_anunciar_maquina_passo_5
		],
		notas: [
			m.ajuda_anunciar_maquina_nota_1,
			m.ajuda_anunciar_maquina_nota_2
		]
	},
	{
		slug: 'anunciar-insumo',
		section: 'anunciar',
		title: m.ajuda_anunciar_insumo_titulo,
		summary: m.ajuda_anunciar_insumo_resumo,
		objetivo: m.ajuda_anunciar_insumo_objetivo,
		onde: [
			{ label: m.ajuda_anunciar_insumo_onde_1_rotulo, text: m.ajuda_anunciar_insumo_onde_1_texto, href: '/anunciar' }
		],
		passos: [
			m.ajuda_anunciar_insumo_passo_1,
			m.ajuda_anunciar_insumo_passo_2,
			m.ajuda_anunciar_insumo_passo_3,
			m.ajuda_anunciar_insumo_passo_4,
			m.ajuda_anunciar_insumo_passo_5
		],
		notas: [
			m.ajuda_anunciar_insumo_nota_1,
			m.ajuda_anunciar_insumo_nota_2
		]
	},
	{
		slug: 'oferecer-servico',
		section: 'anunciar',
		title: m.ajuda_oferecer_servico_titulo,
		summary: m.ajuda_oferecer_servico_resumo,
		objetivo: m.ajuda_oferecer_servico_objetivo,
		onde: [
			{ label: m.ajuda_oferecer_servico_onde_1_rotulo, text: m.ajuda_oferecer_servico_onde_1_texto, href: '/servicos' },
			{ label: m.ajuda_oferecer_servico_onde_2_rotulo, text: m.ajuda_oferecer_servico_onde_2_texto, href: '/servicos/novo' }
		],
		passos: [
			m.ajuda_oferecer_servico_passo_1,
			m.ajuda_oferecer_servico_passo_2,
			m.ajuda_oferecer_servico_passo_3,
			m.ajuda_oferecer_servico_passo_4,
			m.ajuda_oferecer_servico_passo_5
		],
		notas: [
			m.ajuda_oferecer_servico_nota_1
		]
	},
	{
		slug: 'gerenciar-anuncios',
		section: 'anunciar',
		title: m.ajuda_gerenciar_anuncios_titulo,
		summary: m.ajuda_gerenciar_anuncios_resumo,
		objetivo: m.ajuda_gerenciar_anuncios_objetivo,
		onde: [
			{ label: m.ajuda_gerenciar_anuncios_onde_1_rotulo, text: m.ajuda_gerenciar_anuncios_onde_1_texto, href: '/inventario' },
			{ label: m.ajuda_gerenciar_anuncios_onde_2_rotulo, text: m.ajuda_gerenciar_anuncios_onde_2_texto, href: '/servicos' }
		],
		passos: [
			m.ajuda_gerenciar_anuncios_passo_1,
			m.ajuda_gerenciar_anuncios_passo_2,
			m.ajuda_gerenciar_anuncios_passo_3,
			m.ajuda_gerenciar_anuncios_passo_4
		],
		notas: [
			m.ajuda_gerenciar_anuncios_nota_1,
			m.ajuda_gerenciar_anuncios_nota_2
		]
	},
	{
		slug: 'fazer-proposta',
		section: 'negociar',
		title: m.ajuda_fazer_proposta_titulo,
		summary: m.ajuda_fazer_proposta_resumo,
		objetivo: m.ajuda_fazer_proposta_objetivo,
		onde: [
			{ label: m.ajuda_fazer_proposta_onde_1_rotulo, text: m.ajuda_fazer_proposta_onde_1_texto },
			{ label: m.ajuda_fazer_proposta_onde_2_rotulo, text: m.ajuda_fazer_proposta_onde_2_texto, href: '/negociacoes' }
		],
		passos: [
			m.ajuda_fazer_proposta_passo_1,
			m.ajuda_fazer_proposta_passo_2,
			m.ajuda_fazer_proposta_passo_3,
			m.ajuda_fazer_proposta_passo_4
		],
		notas: [
			m.ajuda_fazer_proposta_nota_1,
			m.ajuda_fazer_proposta_nota_2
		]
	},
	{
		slug: 'responder-propostas',
		section: 'negociar',
		title: m.ajuda_responder_propostas_titulo,
		summary: m.ajuda_responder_propostas_resumo,
		objetivo: m.ajuda_responder_propostas_objetivo,
		onde: [
			{ label: m.ajuda_responder_propostas_onde_1_rotulo, text: m.ajuda_responder_propostas_onde_1_texto },
			{ label: m.ajuda_responder_propostas_onde_2_rotulo, text: m.ajuda_responder_propostas_onde_2_texto, href: '/negociacoes' }
		],
		passos: [
			m.ajuda_responder_propostas_passo_1,
			m.ajuda_responder_propostas_passo_2,
			m.ajuda_responder_propostas_passo_3,
			m.ajuda_responder_propostas_passo_4
		],
		notas: [
			m.ajuda_responder_propostas_nota_1,
			m.ajuda_responder_propostas_nota_2
		]
	},
	{
		slug: 'acompanhar-operacao',
		section: 'operacao',
		title: m.ajuda_acompanhar_operacao_titulo,
		summary: m.ajuda_acompanhar_operacao_resumo,
		objetivo: m.ajuda_acompanhar_operacao_objetivo,
		onde: [
			{ label: m.ajuda_acompanhar_operacao_onde_1_rotulo, text: m.ajuda_acompanhar_operacao_onde_1_texto, href: '/painel-de-controle' },
			{ label: m.ajuda_acompanhar_operacao_onde_2_rotulo, text: m.ajuda_acompanhar_operacao_onde_2_texto, href: '/painel-de-controle/agenda' }
		],
		passos: [
			m.ajuda_acompanhar_operacao_passo_1,
			m.ajuda_acompanhar_operacao_passo_2,
			m.ajuda_acompanhar_operacao_passo_3,
			m.ajuda_acompanhar_operacao_passo_4
		],
		notas: [
			m.ajuda_acompanhar_operacao_nota_1,
			m.ajuda_acompanhar_operacao_nota_2
		]
	},
	{
		slug: 'cancelar-operacao',
		section: 'operacao',
		title: m.ajuda_cancelar_operacao_titulo,
		summary: m.ajuda_cancelar_operacao_resumo,
		objetivo: m.ajuda_cancelar_operacao_objetivo,
		onde: [
			{ label: m.ajuda_cancelar_operacao_onde_1_rotulo, text: m.ajuda_cancelar_operacao_onde_1_texto }
		],
		passos: [
			m.ajuda_cancelar_operacao_passo_1,
			m.ajuda_cancelar_operacao_passo_2,
			m.ajuda_cancelar_operacao_passo_3,
			m.ajuda_cancelar_operacao_passo_4
		],
		notas: [
			m.ajuda_cancelar_operacao_nota_1,
			m.ajuda_cancelar_operacao_nota_2
		]
	},
	{
		slug: 'avaliacoes',
		section: 'operacao',
		title: m.ajuda_avaliacoes_titulo,
		summary: m.ajuda_avaliacoes_resumo,
		objetivo: m.ajuda_avaliacoes_objetivo,
		onde: [
			{ label: m.ajuda_avaliacoes_onde_1_rotulo, text: m.ajuda_avaliacoes_onde_1_texto },
			{ label: m.ajuda_avaliacoes_onde_2_rotulo, text: m.ajuda_avaliacoes_onde_2_texto }
		],
		passos: [
			m.ajuda_avaliacoes_passo_1,
			m.ajuda_avaliacoes_passo_2,
			m.ajuda_avaliacoes_passo_3
		],
		notas: [
			m.ajuda_avaliacoes_nota_1,
			m.ajuda_avaliacoes_nota_2
		]
	},
	{
		slug: 'painel-e-agenda',
		section: 'conta',
		title: m.ajuda_painel_e_agenda_titulo,
		summary: m.ajuda_painel_e_agenda_resumo,
		objetivo: m.ajuda_painel_e_agenda_objetivo,
		onde: [
			{ label: m.ajuda_painel_e_agenda_onde_1_rotulo, text: m.ajuda_painel_e_agenda_onde_1_texto, href: '/painel-de-controle' },
			{ label: m.ajuda_painel_e_agenda_onde_2_rotulo, text: m.ajuda_painel_e_agenda_onde_2_texto, href: '/painel-de-controle/agenda' }
		],
		passos: [
			m.ajuda_painel_e_agenda_passo_1,
			m.ajuda_painel_e_agenda_passo_2,
			m.ajuda_painel_e_agenda_passo_3
		],
		notas: [
			m.ajuda_painel_e_agenda_nota_1
		]
	},
	{
		slug: 'seguranca-e-privacidade',
		section: 'conta',
		title: m.ajuda_seguranca_e_privacidade_titulo,
		summary: m.ajuda_seguranca_e_privacidade_resumo,
		objetivo: m.ajuda_seguranca_e_privacidade_objetivo,
		onde: [
			{ label: m.ajuda_seguranca_e_privacidade_onde_1_rotulo, text: m.ajuda_seguranca_e_privacidade_onde_1_texto, href: '/privacidade' },
			{ label: m.ajuda_seguranca_e_privacidade_onde_2_rotulo, text: m.ajuda_seguranca_e_privacidade_onde_2_texto, href: '/termos' }
		],
		passos: [
			m.ajuda_seguranca_e_privacidade_passo_1,
			m.ajuda_seguranca_e_privacidade_passo_2,
			m.ajuda_seguranca_e_privacidade_passo_3,
			m.ajuda_seguranca_e_privacidade_passo_4
		],
		notas: [
			m.ajuda_seguranca_e_privacidade_nota_1
		]
	}
];

/**
 * Temas da ajuda com os títulos no idioma atual.
 * @returns {HelpSection[]}
 */
export function getHelpSections() {
	return SECTIONS.map((section) => ({ ...section, title: section.title() }));
}

/**
 * Artigos da ajuda com os textos no idioma atual (a ordem é a da leitura: anterior / próximo).
 * @returns {HelpArticle[]}
 */
export function getHelpArticles() {
	return ARTICLES.map((article) => ({
		slug: article.slug,
		section: article.section,
		title: article.title(),
		summary: article.summary(),
		objetivo: article.objetivo(),
		onde: article.onde.map((place) => ({ label: place.label(), text: place.text(), href: place.href })),
		passos: article.passos.map((step) => step()),
		notas: article.notas.map((note) => note())
	}));
}

/** @param {string} slug */
export function findHelpArticle(slug) {
	return getHelpArticles().find((article) => article.slug === slug) ?? null;
}

/** @param {string} sectionId */
export function findHelpSection(sectionId) {
	return getHelpSections().find((section) => section.id === sectionId) ?? null;
}

/**
 * @param {string} sectionId
 * @param {HelpArticle[]} [articles] lista já montada (evita montar de novo a cada tema)
 */
export function helpArticlesIn(sectionId, articles = getHelpArticles()) {
	return articles.filter((article) => article.section === sectionId);
}

/** @param {string} value */
function normalize(value) {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/** @param {HelpArticle} article */
function articleSentences(article) {
	return [
		article.objetivo,
		...article.onde.map((place) => `${place.label}: ${place.text}`),
		...article.passos,
		...article.notas
	];
}

/**
 * Busca sem acento nem maiúsculas no título, resumo e corpo dos artigos, no idioma atual.
 * Título e resumo pesam mais. Quando o termo só aparece no corpo, o trecho
 * mostrado é a frase (passo ou observação) onde ele aparece.
 * @param {string} query
 */
export function searchHelp(query) {
	const terms = normalize(query).split(/\s+/).filter((term) => term.length > 1);
	if (!terms.length) return [];

	return getHelpArticles()
		.map((article) => {
			const head = normalize(`${article.title} ${article.summary}`);
			const sentences = articleSentences(article);
			const body = normalize(sentences.join(' '));
			if (!terms.every((term) => head.includes(term) || body.includes(term))) return null;

			const score = terms.reduce((total, term) => total + (head.includes(term) ? 3 : 1), 0);
			const inHead = terms.some((term) => head.includes(term));
			const excerpt = inHead
				? article.summary
				: (sentences.find((sentence) => terms.some((term) => normalize(sentence).includes(term))) ?? article.summary);
			return { article, score, excerpt };
		})
		.filter((result) => result !== null)
		.sort((a, b) => b.score - a.score);
}
