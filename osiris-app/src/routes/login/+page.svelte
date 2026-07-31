<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { supabase } from '$lib/supabase';
	import { subscribeToPush } from '$lib/push';

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
			await subscribeToPush(session.user.id);
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
				subscribeToPush(session.user.id);
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

<div class="min-h-screen bg-surface-50-950 pb-24">
	<Header />

	<main class="mx-auto flex w-full max-w-md flex-col px-4 py-8">
		{#if loading}
			<div class="flex flex-1 flex-col items-center justify-center py-20">
				<LoadingIndicator label="Verificando sessão..." />
			</div>
		{:else}
			<div class="text-center">
				<p class="text-xs font-semibold uppercase tracking-wider text-primary-700">Marketplace Osiris</p>
				<h1 class="mt-2 text-2xl font-bold">Bem-vindo de volta</h1>
				<p class="mt-2 text-sm text-surface-700-300">
					Entre para anunciar, negociar e gerenciar seu inventário no agro.
				</p>
			</div>

			<div class="mt-8 rounded-container border border-surface-200-800 bg-surface-50-950 p-6 ">
				{#if errorMessage}
					<div class="mb-4 rounded-container preset-tonal-error p-3 text-sm">{errorMessage}</div>
				{/if}

				<button
					type="button"
					onclick={handleGoogleLogin}
					disabled={signingIn}
					class="flex w-full items-center justify-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 px-4 py-3.5 text-sm font-semibold transition-all hover:preset-tonal disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if signingIn}
						<LoadingIndicator
							label="Conectando..."
							size="1.25rem"
							compact={true}
							showLabel={false}
						/>
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

				<p class="mt-5 text-center text-xs leading-relaxed text-surface-700-300">
					Ao continuar, você concorda com os termos do marketplace e a criação da sua conta no
					Osiris.
				</p>
			</div>

			<div class="mt-6 rounded-container preset-filled-primary-500 p-4">
				<p class="text-sm font-semibold">Por que entrar?</p>
				<ul class="mt-2 space-y-1.5 text-xs opacity-90">
					<li>• Publique maquinário e insumos</li>
					<li>• Gerencie anúncios no inventário</li>
					<li>• Negocie com outros produtores</li>
				</ul>
			</div>

			<p class="mt-6 text-center text-sm text-surface-700-300">
				<a href="/" class="font-medium text-primary-600 hover:text-primary-700">Continuar sem login</a>
			</p>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
