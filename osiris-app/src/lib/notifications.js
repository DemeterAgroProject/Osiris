// Texto das notificações no idioma de quem lê. O banco grava o tipo (type) e os dados variáveis
// (params: nome, nota, status) junto com um título e um corpo em português; aqui o texto é
// montado de novo pelo tipo. Tipo desconhecido ou notificação antiga sem params: usa o que veio
// do banco. A Edge Function send-push tem a mesma tabela para o push (supabase/functions/send-push).
import { m } from '$lib/paraglide/messages';

/** Rótulo do status da operação (bookings.status) no idioma atual. */
export function bookingStatusLabel(status) {
	const labels = {
		pendente: m.status_operacao_pendente,
		em_operacao: m.status_operacao_em_operacao,
		em_avaliacao: m.status_operacao_em_avaliacao,
		finalizada: m.status_operacao_finalizada,
		cancelado: m.status_operacao_cancelado
	};
	return labels[status]?.() ?? status;
}

/**
 * @param {{ type: string, title?: string, body?: string, params?: Record<string, any> | null }} notification
 * @returns {{ title: string, body: string }}
 */
export function notificationText(notification) {
	const p = notification.params ?? {};
	const nome = p.nome || null;
	switch (notification.type) {
		case 'nova_avaliacao':
			return {
				title: m.notif_nova_avaliacao_titulo(),
				body: p.nota ? m.notif_nova_avaliacao_corpo({ nome: nome ?? m.notif_alguem(), nota: p.nota }) : notification.body ?? ''
			};
		case 'nova_negociacao':
			return {
				title: m.notif_nova_negociacao_titulo(),
				body: m.notif_nova_negociacao_corpo({ nome: nome ?? m.notif_um_cliente() })
			};
		case 'nova_mensagem':
			return { title: m.notif_nova_mensagem_titulo(), body: m.notif_nova_mensagem_corpo() };
		case 'negociacao_aceita':
			return { title: m.notif_negociacao_aceita_titulo(), body: m.notif_negociacao_aceita_corpo() };
		case 'negociacao_recusada':
			return { title: m.notif_negociacao_recusada_titulo(), body: m.notif_negociacao_recusada_corpo() };
		case 'negociacao_cancelada':
			return { title: m.notif_negociacao_cancelada_titulo(), body: m.notif_negociacao_cancelada_corpo() };
		case 'operacao_cancelada':
			return { title: m.notif_operacao_cancelada_titulo(), body: m.notif_operacao_cancelada_corpo() };
		case 'status_reserva':
			return p.status
				? { title: m.notif_status_reserva_titulo(), body: m.notif_status_reserva_corpo({ status: bookingStatusLabel(p.status) }) }
				: { title: m.notif_status_reserva_titulo(), body: notification.body ?? '' };
		case 'solicitacao_avaliacao':
			return { title: m.notif_solicitacao_avaliacao_titulo(), body: m.notif_solicitacao_avaliacao_corpo() };
		default:
			return { title: notification.title ?? '', body: notification.body ?? '' };
	}
}
