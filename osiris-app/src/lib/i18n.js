// Idiomas do app (português, inglês e espanhol). Os textos ficam em messages/{pt,en,es}.json e são
// compilados pelo Paraglide em src/lib/paraglide (use `import { m } from '$lib/paraglide/messages'`).
// O idioma vem da escolha salva (cookie), senão do navegador, senão português. Ver docs/i18n.md.
import { getLocale, setLocale } from '$lib/paraglide/runtime';
import { supabase } from '$lib/supabase';

/** Rótulo de cada idioma no próprio idioma (o seletor mostra assim). */
export const LANGUAGES = [
	{ code: 'pt', label: 'Português' },
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' }
];

// a moeda continua o real (o mercado é o Brasil); muda só a forma de escrever datas e números
const INTL_LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-AR' };

/** Locale para Intl / toLocaleString ("pt-BR", "en-US", "es-AR"). */
export function intlLocale() {
	return INTL_LOCALE[getLocale()] ?? 'pt-BR';
}

/** Valor em reais no formato do idioma atual ("R$ 1.500,00", "R$1,500.00"). */
export function formatBRL(value, options = {}) {
	return new Intl.NumberFormat(intlLocale(), {
		style: 'currency',
		currency: 'BRL',
		currencyDisplay: 'narrowSymbol',
		...options
	}).format(Number(value));
}

/** Número no formato do idioma atual. */
export function formatNumber(value, options = {}) {
	return new Intl.NumberFormat(intlLocale(), options).format(Number(value));
}

/** Data (e hora, se pedida nas opções) no formato do idioma atual. */
export function formatDate(value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(intlLocale(), options);
}

const SYNCED_KEY = 'osiris-idioma-no-perfil';

/**
 * Grava o idioma no perfil: as notificações push são escritas no idioma de cada pessoa.
 * profiles.locale não é legível pela API (como a cidade); o aparelho lembra o que já gravou
 * e só escreve quando muda.
 */
export async function syncProfileLocale(userId) {
	if (!userId) return;
	const locale = getLocale();
	const marker = `${userId}:${locale}`;
	try {
		if (localStorage.getItem(SYNCED_KEY) === marker) return;
	} catch {
		// sem storage: grava a cada carregamento
	}
	const { error } = await supabase.from('profiles').update({ locale }).eq('id', userId);
	if (error) return;
	try {
		localStorage.setItem(SYNCED_KEY, marker);
	} catch {
		// ignora
	}
}

/** Troca o idioma (salva no cookie e no perfil) e recarrega a página já traduzida. */
export async function changeLanguage(code) {
	if (code === getLocale()) return;
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (session?.user) {
		const { error } = await supabase.from('profiles').update({ locale: code }).eq('id', session.user.id);
		if (!error) {
			try {
				localStorage.setItem(SYNCED_KEY, `${session.user.id}:${code}`);
			} catch {
				// ignora
			}
		}
	}
	setLocale(code);
}
