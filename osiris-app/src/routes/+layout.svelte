<script>
	import { onNavigate } from '$app/navigation';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppToaster from '$lib/components/ui/AppToaster.svelte';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import OnboardingGate from '$lib/components/OnboardingGate.svelte';

	let { children } = $props();

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
