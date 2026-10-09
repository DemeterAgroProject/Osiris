<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(async () => {
		await goto(resolve('/painel-de-controle/agenda'), { replaceState: true });
	});
</script>
