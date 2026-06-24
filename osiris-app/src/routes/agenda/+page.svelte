<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(async () => {
		await goto('/painel-de-controle/agenda', { replaceState: true });
	});
</script>
