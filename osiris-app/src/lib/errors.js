import { m } from '$lib/paraglide/messages';
import { bookingStatusLabel } from '$lib/notifications';

// rótulos dos status de negociação; os de operação (e o "cancelado") vêm de bookingStatusLabel
const NEGOTIATION_STATUS = {
	solicitada: m.app_status_negociacao_solicitada,
	em_negociacao: m.app_status_negociacao_em_negociacao,
	aceita: m.app_status_negociacao_aceita,
	recusada: m.app_status_negociacao_recusada
};

function statusLabel(status) {
	const value = status.trim();
	return NEGOTIATION_STATUS[value]?.() ?? bookingStatusLabel(value);
}

/**
 * Exceções das regras de negócio do banco (texto em português, sem acento na maioria) → mensagem
 * no idioma atual. Os padrões comparam o texto sem acento e em minúsculas; `%` dos RAISE vira grupo.
 * Guarda funções (nunca m.x() no topo do módulo): o idioma é lido na hora.
 * @type {[RegExp, (match: RegExpMatchArray) => string][]}
 */
const DB_ERRORS = [
	[/^apenas o prestador pode aceitar ou recusar a proposta/, () => m.app_dberro_prestador_aceitar_recusar()],
	[/^apenas o prestador pode alterar os termos da proposta/, () => m.app_dberro_prestador_alterar_termos()],
	[/^apenas o prestador pode avancar a operacao/, () => m.app_dberro_prestador_avancar()],
	[/^apenas o proprietario do anuncio pode aceitar esta proposta/, () => m.app_dberro_proprietario_aceitar()],
	[/^apenas participantes podem alterar a negociacao/, () => m.app_dberro_participantes_alterar_negociacao()],
	[/^apenas participantes podem cancelar a negociacao/, () => m.app_dberro_participantes_cancelar_negociacao()],
	[/^apenas participantes podem cancelar a operacao/, () => m.app_dberro_participantes_cancelar_operacao()],
	[/^entre na sua conta para ativar as notificacoes/, () => m.app_dberro_login_notificacoes()],
	[
		/^esta negociacao nao esta em um estado valido para ser aceita \(status atual: (.+)\)/,
		(match) => m.app_dberro_negociacao_estado_aceitar({ status: statusLabel(match[1]) })
	],
	[/^inscricao de notificacao invalida/, () => m.app_dberro_inscricao_invalida()],
	[/^metadados de cancelamento sao imutaveis/, () => m.app_dberro_cancelamento_imutavel()],
	[/^negociacao encerrada nao pode mudar de status/, () => m.app_dberro_negociacao_encerrada()],
	[/^negociacao nao encontrada/, () => m.app_dberro_negociacao_nao_encontrada()],
	[/^operacao cancelada nao pode mudar de status/, () => m.app_dberro_operacao_cancelada()],
	[/^operacao nao encontrada/, () => m.app_dberro_operacao_nao_encontrada()],
	[
		/^operacao no status (.+) nao pode ser cancelada/,
		(match) => m.app_dberro_operacao_nao_cancelavel({ status: statusLabel(match[1]) })
	],
	[/^os termos da operacao sao imutaveis/, () => m.app_dberro_termos_operacao_imutaveis()],
	[/^participantes e alvo da negociacao sao imutaveis/, () => m.app_dberro_participantes_imutaveis()],
	[/^somente administradores podem alterar o tipo de conta/, () => m.app_dberro_somente_admin()],
	[/^somente negociacoes abertas podem ser canceladas/, () => m.app_dberro_somente_abertas()],
	[
		/^transicao de status invalida: (.+?) -> (.+?)\.?$/,
		(match) => m.app_dberro_transicao_invalida({ de: statusLabel(match[1]), para: statusLabel(match[2]) })
	],
	[/^usuario autenticado obrigatorio/, () => m.app_dberro_login_obrigatorio()],
	[/^cancellation_reason e obrigatorio/, () => m.app_dberro_motivo_obrigatorio()],
	[/^cancellation_reason_details deve ter pelo menos 15 caracteres/, () => m.app_dberro_motivo_curto()],
	[/^cancelled_by deve ser cliente ou prestador/, () => m.app_dberro_cancelado_por_participante()],
	[/^cancelled_by deve ser o usuario autenticado/, () => m.app_dberro_cancelado_por_usuario()]
];

/** Mensagem do banco no idioma atual; texto não reconhecido volta como veio. */
function translateDbMessage(message) {
	const normalized = message
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
	for (const [pattern, translate] of DB_ERRORS) {
		const match = normalized.match(pattern);
		if (match) return translate(match);
	}
	return message;
}

/**
 * Texto de erro para mostrar ao usuário a partir de um erro do Supabase.
 *
 * As regras de negócio do banco (exceções dos triggers e RPCs, código P0001, e as nossas
 * mensagens com código 42501) são escritas em português; as conhecidas são traduzidas para o
 * idioma atual (DB_ERRORS) e as outras aparecem como estão. O resto (violação de RLS, falha de
 * rede, erro do Postgres) vira `fallback`, e o detalhe técnico fica só no console.
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @param {string} fallback texto amigável (já traduzido) da ação que falhou
 */
export function userMessage(error, fallback) {
	if (!error) return fallback;
	console.error(fallback, error);

	const message = error.message ?? '';
	const technical = /row-level security|permission denied|violates|duplicate key|JWT|fetch/i.test(message);

	if (error.code === 'P0001' && message) return translateDbMessage(message);
	if (error.code === '42501') {
		return technical || !message ? m.comum_sem_permissao() : translateDbMessage(message);
	}
	return fallback;
}
