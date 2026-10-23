// Dados de quem responde pelo app, usados nos Termos de uso e na Política de privacidade.
// Responsável e data são getters: o texto sai no idioma atual na hora de ler (nada fica congelado no módulo).
import { m } from '$lib/paraglide/messages';
import { formatDate } from '$lib/i18n';

// nome próprio: fica em português em todos os idiomas
const UNIVERSIDADE = 'Universidade Federal do Pampa (UNIPAMPA)';
// data da última versão dos termos e da política (ano, mês de 0 a 11, dia)
const ATUALIZADO_EM = new Date(2026, 9, 20);

export const LEGAL = {
	get responsavel() {
		return m.legal_responsavel({ universidade: UNIVERSIDADE });
	},
	contato: 'projetoosiris@unipampa.edu.br',
	get atualizadoEm() {
		return formatDate(ATUALIZADO_EM, { day: 'numeric', month: 'long', year: 'numeric' });
	}
};
