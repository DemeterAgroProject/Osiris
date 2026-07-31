<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

	let loading = $state(true);

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user?.id) {
			await goto(`/perfil/${user.id}`, { replaceState: true });
			return;
		}

		await goto('/login?redirect=/perfil', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Perfil — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	{#if loading}
		<LoadingIndicator label="Carregando perfil..." />
	{/if}
</div>
