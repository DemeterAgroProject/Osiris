import { supabase } from '$lib/supabase';

// Colunas de profiles liberadas para leitura de qualquer usuário (ver migration de privacidade).
export const PUBLIC_PROFILE_COLUMNS = 'id, display_name, photo_url, role';

/**
 * Carrega um perfil. E-mail, telefone e CPF só vêm quando o perfil é do próprio usuário,
 * via RPC get_my_profile; para os demais, apenas as colunas públicas.
 * @param {string} profileId
 * @param {string | null | undefined} authUserId
 */
export async function fetchProfile(profileId, authUserId) {
	if (authUserId && authUserId === profileId) {
		return supabase.rpc('get_my_profile').maybeSingle();
	}

	return supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', profileId).maybeSingle();
}
