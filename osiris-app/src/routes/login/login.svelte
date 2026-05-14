<script>
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	// Usamos a runa $state para a tela reagir quando o usuário for carregado
	let sessionUser = $state(null);
	let loading = $state(true);

	onMount(async () => {
		// Busca a sessão atual assim que a página carrega
		const { data } = await supabase.auth.getSession();
		sessionUser = data.session?.user;
		loading = false;

		// Fica escutando caso o usuário faça login/logout em outra aba
		supabase.auth.onAuthStateChange((_event, session) => {
			sessionUser = session?.user;
		});
	});

	async function handleLogout() {
		await supabase.auth.signOut();
	}
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
	{#if loading}
		<p class="text-gray-500 animate-pulse">Verificando acesso...</p>
	{:else if sessionUser}
		<div class="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full">
			<div class="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
			</div>

			<h1 class="text-2xl font-bold text-gray-800 mb-2">Login realizado com sucesso!</h1>
			<p class="text-gray-600 mb-6">Você está logado como: <br><strong class="text-gray-900">{sessionUser.email}</strong></p>

			<button
				onclick={handleLogout}
				class="w-full bg-red-50 text-red-600 font-semibold py-2 rounded-lg hover:bg-red-100 transition"
			>
				Sair da Conta
			</button>
		</div>
	{:else}
		<div class="text-center">
			<h1 class="text-3xl font-bold mb-4">Bem-vindo ao Osíris</h1>
			<p class="text-gray-600 mb-6">Você não está logado.</p>
			<a
				href="/login"
				class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
			>
				Fazer Login para Anunciar
			</a>
		</div>
	{/if}
</div>