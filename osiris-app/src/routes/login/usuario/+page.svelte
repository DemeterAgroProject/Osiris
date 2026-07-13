<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user?.id) {
			await goto(`/login/usuario/${user.id}`, { replaceState: true });
			return;
		}

		await goto('/login?redirect=/login/usuario', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Meu perfil — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	<div
		class="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
		aria-label="Carregando"
	></div>
</div>
