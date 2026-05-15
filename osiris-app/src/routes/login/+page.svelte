<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';

	let loading = $state(true);
	let signingIn = $state(false);
	let errorMessage = $state('');

	const redirectTo = $derived(page.url.searchParams.get('redirect') || '');

	function safeRedirectPath(path) {
		if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
		return path;
	}

	async function checkExistingSession() {
		loading = true;
		errorMessage = '';

		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (session?.user) {
			const target = safeRedirectPath(redirectTo) || `/login/usuario/${session.user.id}`;
			await goto(target, { replaceState: true });
			return;
		}

		loading = false;
	}

	async function handleGoogleLogin() {
		signingIn = true;
		errorMessage = '';

		const returnPath = safeRedirectPath(redirectTo) || '/login';
		const redirectUrl = `${window.location.origin}${returnPath}`;

		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: redirectUrl
			}
		});

		if (error) {
			errorMessage = 'Não foi possível iniciar o login. Tente novamente.';
			console.error('Erro no login:', error.message);
			signingIn = false;
		}
	}

	onMount(() => {
		checkExistingSession();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.user) {
				const target = safeRedirectPath(redirectTo) || `/login/usuario/${session.user.id}`;
				goto(target, { replaceState: true });
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Entrar — Osiris</title>
	<meta name="description" content="Faça login no marketplace Osiris com sua conta Google." />
</svelte:head>

<div class="min-h-screen bg-gray-50 pb-24">
	<Header />

	<main class="mx-auto flex w-full max-w-md flex-col px-4 py-8">
		{#if loading}
			<div class="flex flex-1 flex-col items-center justify-center py-20">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-500">Verificando sessão...</p>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-xs font-semibold uppercase tracking-wider text-green-700">Marketplace Osiris</p>
				<h1 class="mt-2 text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
				<p class="mt-2 text-sm text-gray-500">
					Entre para anunciar, negociar e gerenciar seu inventário no agro.
				</p>
			</div>

			<div class="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				{#if errorMessage}
					<div class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
				{/if}

				<button
					type="button"
					onclick={handleGoogleLogin}
					disabled={signingIn}
					class="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if signingIn}
						<span
							class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-green-600"
						></span>
						Conectando...
					{:else}
						<img
							src="https://www.google.com/favicon.ico"
							alt=""
							class="h-5 w-5"
							width="20"
							height="20"
						/>
						Continuar com Google
					{/if}
				</button>

				<p class="mt-5 text-center text-xs leading-relaxed text-gray-400">
					Ao continuar, você concorda com os termos do marketplace e a criação da sua conta no
					Osiris.
				</p>
			</div>

			<div class="mt-6 rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 p-4 text-white">
				<p class="text-sm font-semibold">Por que entrar?</p>
				<ul class="mt-2 space-y-1.5 text-xs text-green-100">
					<li>• Publique maquinário e insumos</li>
					<li>• Gerencie anúncios no inventário</li>
					<li>• Negocie com outros produtores</li>
				</ul>
			</div>

			<p class="mt-6 text-center text-sm text-gray-500">
				<a href="/" class="font-medium text-green-700 hover:text-green-800">Continuar sem login</a>
			</p>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
