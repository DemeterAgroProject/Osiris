<script>
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppToaster from '$lib/components/ui/AppToaster.svelte';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import OnboardingGate from '$lib/components/OnboardingGate.svelte';

	let { children } = $props();

	// o service worker (static/sw.js) recebe o push e deixa o app instalável na tela de início
	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((error) => {
				console.error('Erro ao registrar o service worker:', error);
			});
		}
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
