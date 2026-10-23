<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { m } from '$lib/paraglide/messages';

	let loading = $state(true);

	onMount(async () => {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user?.id) {
			await goto(resolve(`/perfil/${user.id}`), { replaceState: true });
			return;
		}

		await goto(resolve('/login?redirect=/perfil'), { replaceState: true });
	});
</script>

<svelte:head>
	<title>{m.operacao_perfil()} — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	{#if loading}
		<LoadingIndicator label={m.operacao_carregando_perfil()} />
	{/if}
</div>
