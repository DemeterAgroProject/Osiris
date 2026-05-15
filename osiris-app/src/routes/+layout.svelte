<script>
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	let session = $derived(data.session);

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
{@render children()}
