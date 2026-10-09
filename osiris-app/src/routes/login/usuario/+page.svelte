<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user?.id) {
			await goto(resolve(`/login/usuario/${user.id}`), { replaceState: true });
			return;
		}

		await goto(resolve('/login?redirect=/login/usuario'), { replaceState: true });
	});
</script>

<svelte:head>
	<title>Meu perfil — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	<LoadingIndicator label="Carregando perfil..." />
</div>
