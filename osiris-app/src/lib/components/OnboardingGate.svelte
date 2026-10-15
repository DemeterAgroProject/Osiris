<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import { onboardingSeen } from '$lib/onboarding';

	// No primeiro acesso logado (neste aparelho), mostra a apresentação do app
	// e depois volta para a página onde a pessoa estava.

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
			if (!session?.user || onboardingSeen()) return;

			const { pathname, search } = window.location;
			// a tela de login decide o destino sozinha (e já passa pela apresentação)
			if (pathname.startsWith('/boas-vindas') || pathname === '/login') return;

			// fora do callback do Supabase, para não travar o cliente
			setTimeout(() => {
				const back = encodeURIComponent(`${pathname}${search}`);
				goto(resolve(`/boas-vindas?redirect=${back}`), { replaceState: true });
			}, 0);
		});

		return () => subscription.unsubscribe();
	});
</script>
