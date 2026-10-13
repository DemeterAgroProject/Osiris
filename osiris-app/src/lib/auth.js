import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { supabase } from '$lib/supabase';

/**
 * Retorna o usuário logado. Sem login, leva para /login e, depois de entrar, volta para `returnTo`.
 * Use no carregamento das telas privadas: `const user = await requireUser('/inventario'); if (!user) return;`
 * @param {string} returnTo caminho da tela atual
 */
export async function requireUser(returnTo) {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		await goto(resolve(`/login?redirect=${returnTo}`), { replaceState: true });
		return null;
	}

	return user;
}
