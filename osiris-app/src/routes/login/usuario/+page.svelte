<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

	// endereço antigo do "Meu perfil": o perfil agora fica só em /perfil/[id]
	onMount(() => {
		goto(resolve('/perfil'), { replaceState: true });
	});
</script>

<svelte:head>
	<title>Meu perfil — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	<LoadingIndicator label="Carregando perfil..." />
</div>
