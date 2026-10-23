<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { m } from '$lib/paraglide/messages';

	// endereço antigo do "Meu perfil": o perfil agora fica só em /perfil/[id]
	onMount(() => {
		goto(resolve('/perfil'), { replaceState: true });
	});
</script>

<svelte:head>
	<title>{m.operacao_meu_perfil()} — Osiris</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface-50-950">
	<LoadingIndicator label={m.operacao_carregando_perfil()} />
</div>
