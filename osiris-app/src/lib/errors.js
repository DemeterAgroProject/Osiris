/**
 * Texto de erro para mostrar ao usuário a partir de um erro do Supabase.
 *
 * As regras de negócio do banco (exceções dos triggers e RPCs, código P0001, e as nossas
 * mensagens com código 42501) já são escritas em português para o usuário, então aparecem
 * como estão. O resto (violação de RLS, falha de rede, erro do Postgres) vira `fallback`, e o
 * detalhe técnico fica só no console.
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @param {string} fallback texto amigável da ação que falhou
 */
export function userMessage(error, fallback) {
	if (!error) return fallback;
	console.error(fallback, error);

	const message = error.message ?? '';
	const technical = /row-level security|permission denied|violates|duplicate key|JWT|fetch/i.test(message);

	if (error.code === 'P0001' && message) return message;
	if (error.code === '42501') {
		return technical || !message ? 'Você não tem permissão para fazer isso.' : message;
	}
	return fallback;
}
