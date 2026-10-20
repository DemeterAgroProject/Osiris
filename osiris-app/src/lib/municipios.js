import { supabase } from '$lib/supabase';

// Localização dos anúncios: município do IBGE (tabela municipios), nunca o endereço.

/** Colunas para embutir o município num select: `municipio:municipios(${MUNICIPIO_EMBED})`. */
export const MUNICIPIO_EMBED = 'codigo_ibge, nome, uf';

/** @typedef {{ codigo_ibge: number, nome: string, uf: string }} Municipio */

/** "Bagé, RS" */
export function formatMunicipio(municipio) {
	return municipio?.nome ? `${municipio.nome}, ${municipio.uf}` : '';
}

/** O embed do Supabase pode vir como objeto ou lista de um item. */
export function pickMunicipio(raw) {
	return (Array.isArray(raw) ? raw[0] : raw) ?? null;
}

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

function normalize(text) {
	return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function queryMunicipios(text, uf) {
	// escapa os curingas do LIKE
	const pattern = `${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
	let query = supabase.from('municipios').select(MUNICIPIO_EMBED).like('nome_busca', pattern);
	if (uf) query = query.eq('uf', uf);
	const { data, error } = await query.order('nome').limit(40);
	if (error) {
		console.error('Erro ao buscar municípios:', error.message);
		return [];
	}
	return data ?? [];
}

/**
 * Busca municípios pelo começo do nome, sem acento ("bage" acha Bagé). Com "Bagé - RS" ou
 * "bage rs", a UF no fim filtra o estado. Como "dom pe" pode ser "Dom Pe…" ou "Dom" em PE,
 * as duas leituras são buscadas e juntadas.
 * @returns {Promise<Municipio[]>}
 */
export async function searchMunicipios(term, limit = 8) {
	const text = normalize(term ?? '');
	if (text.length < 2) return [];

	const searches = [queryMunicipios(text, null)];
	const withUf = text.match(/^(.*?)[\s,/-]+([a-z]{2})$/);
	if (withUf && withUf[1].trim().length >= 2 && UFS.has(withUf[2].toUpperCase())) {
		searches.push(queryMunicipios(withUf[1].trim(), withUf[2].toUpperCase()));
	}
	const [byName, byUf = []] = await Promise.all(searches);

	// sem repetir; as cidades do RS primeiro, que é onde o app está sendo testado
	const unique = new Map([...byUf, ...byName].map((m) => [m.codigo_ibge, m]));
	return [...unique.values()].sort((a, b) => Number(b.uf === 'RS') - Number(a.uf === 'RS')).slice(0, limit);
}

/** Município do perfil do usuário logado (para pré-preencher anúncios), ou null. */
export async function fetchMyMunicipio() {
	const { data } = await supabase.rpc('get_my_profile').maybeSingle();
	if (!data?.municipio_id) return null;
	const { data: municipio } = await supabase
		.from('municipios')
		.select(MUNICIPIO_EMBED)
		.eq('codigo_ibge', data.municipio_id)
		.maybeSingle();
	return municipio ?? null;
}
