<script>
	import { invalidate, onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { Toast, createToaster } from '@skeletonlabs/skeleton-svelte';
	import { provideToaster } from '$lib/toast';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	let session = $derived(data.session);
	const toaster = provideToaster(createToaster({ placement: 'top', overlap: true }));

	onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });

	onMount(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="app-container">
    {@render children()}
</div>

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast {toast}>
			<Toast.Message>
				<Toast.Title>{toast.title}</Toast.Title>
				<Toast.Description>{toast.description}</Toast.Description>
			</Toast.Message>
			<Toast.CloseTrigger />
		</Toast>
	{/snippet}
</Toast.Group>
