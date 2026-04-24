<script>
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	// Usamos $state para que qualquer componente que use a sessão seja atualizado
	let session = $state(data.session);

	onMount(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
			// Se o token mudar, invalidamos os dados para o load() rodar novamente
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
			session = _session;
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
