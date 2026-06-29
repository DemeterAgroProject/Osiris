<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

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

<div class="flex min-h-dvh items-center justify-center bg-gray-50">
	{#if loading}
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
			aria-label="Carregando"
		></div>
	{/if}
</div>
