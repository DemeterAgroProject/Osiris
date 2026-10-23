<script>
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppToaster from '$lib/components/ui/AppToaster.svelte';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import OnboardingGate from '$lib/components/OnboardingGate.svelte';
	import { startTelemetry, trackPageView } from '$lib/telemetry';
	import { supabase } from '$lib/supabase';
	import { syncProfileLocale } from '$lib/i18n';

	let { children } = $props();

	// logs de uso e de erros (src/lib/telemetry.js): captura automática de erros e páginas vistas
	startTelemetry();
	// no carregamento inicial ("enter") o to.route vem vazio: a rota sai do estado da página
	afterNavigate(({ to, type }) => {
		trackPageView(page.route.id ?? to?.route?.id ?? location.pathname, { navegacao: type });
	});

	// o service worker (static/sw.js) recebe o push e deixa o app instalável na tela de início
	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((error) => {
				console.error('Erro ao registrar o service worker:', error);
			});
		}

		// grava o idioma no perfil (o push é escrito nele); o Supabase repete SIGNED_IN ao voltar
		// o foco da aba, então uma vez por conta
		let localeSyncedUserId = null;
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
			const userId = session?.user?.id;
			if (!userId || userId === localeSyncedUserId) return;
			localeSyncedUserId = userId;
			// fora do callback: chamadas ao Supabase dentro dele podem travar o cliente
			setTimeout(() => syncProfileLocale(userId), 0);
		});

		return () => subscription.unsubscribe();
	});

	onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="app-container">
    {@render children()}
</div>
<OnboardingGate />
<PushPrompt />
<AppToaster />
