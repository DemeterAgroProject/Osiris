<script>
	import { supabase } from '$lib/supabase';

	let loading = $state(false);

	async function handleLogin() {
		loading = true;
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/`
			}
		});
		if (error) {
			console.error('Erro:', error.message);
			loading = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
	<div class="text-center">
		<h1 class="text-4xl font-extrabold tracking-tight">Projeto Osíris</h1>
		<p class="text-gray-500 mt-2">Marketplace de Maquinário e Reflorestamento</p>
	</div>

	<div class="card p-8 bg-white shadow-xl rounded-2xl border border-gray-100 max-w-sm w-full">
		<button 
			onclick={handleLogin}
			disabled={loading}
			class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
		>
			{#if loading}
				<span class="animate-spin">🌀</span>
			{:else}
				<img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5" />
			{/if}
			Continuar com Google
		</button>
		
		<p class="text-xs text-center text-gray-400 mt-6">
			Ao continuar, você concorda em criar uma conta no marketplace.
		</p>
	</div>
</div>