import { supabase } from '$lib/supabase';

/**
 * Escuta mudanças do banco num canal do Realtime.
 *
 * Com o celular bloqueado ou o app em segundo plano a conexão cai e os eventos desse
 * intervalo se perdem. Por isso `onChange` também é chamado sem payload quando a página
 * volta a ficar visível e quando o canal reconecta: a tela deve recarregar os dados nesse caso.
 *
 * @param {string} topic nome do canal
 * @param {Array<{ event: '*' | 'INSERT' | 'UPDATE' | 'DELETE', schema: string, table: string, filter?: string }>} changes
 * @param {(payload?: any) => void} onChange
 * @returns {() => void} encerra a escuta
 */
export function watchChanges(topic, changes, onChange) {
	let joinedBefore = false;

	const channel = supabase.channel(topic);
	for (const change of changes) {
		// @ts-expect-error a sobrecarga de .on() não aceita o evento como união
		channel.on('postgres_changes', change, (payload) => onChange(payload));
	}
	channel.subscribe((status) => {
		if (status !== 'SUBSCRIBED') return;
		if (joinedBefore) onChange();
		joinedBefore = true;
	});

	function handleVisibility() {
		if (document.visibilityState === 'visible') onChange();
	}
	document.addEventListener('visibilitychange', handleVisibility);

	return () => {
		document.removeEventListener('visibilitychange', handleVisibility);
		supabase.removeChannel(channel);
	};
}
