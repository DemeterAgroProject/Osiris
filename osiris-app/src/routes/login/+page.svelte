<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';
	import { onboardingSeen, safeRedirectPath } from '$lib/onboarding';
	import { ArrowRight, Archive, CircleAlert, Handshake, Tractor } from 'lucide-svelte';

	const LOGIN_BENEFITS = [
		{ label: 'Publique maquinário e insumos', icon: Tractor },
		{ label: 'Gerencie anúncios no inventário', icon: Archive },
		{ label: 'Negocie com outros produtores', icon: Handshake }
	];

	let loading = $state(true);
	let signingIn = $state(false);
	let errorMessage = $state('');

	const redirectTo = $derived(page.url.searchParams.get('redirect') || '');

	// depois de entrar: volta para onde estava (ou a página inicial), passando antes pela
	// apresentação do app se for o primeiro acesso neste aparelho
	function afterLoginTarget() {
		const target = safeRedirectPath(redirectTo) || '/';
		return onboardingSeen() ? target : `/boas-vindas?redirect=${encodeURIComponent(target)}`;
	}

	async function checkExistingSession() {
		loading = true;
		errorMessage = '';

		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (session?.user) {
			await goto(resolve(afterLoginTarget()), { replaceState: true });
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
				goto(resolve(afterLoginTarget()), { replaceState: true });
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Entrar — Osiris</title>
	<meta name="description" content="Faça login no marketplace Osiris com sua conta Google." />
</svelte:head>

<div class="min-h-screen pb-24">
	<Header title="Entrar" />

	<main class="mx-auto flex w-full max-w-md flex-col px-4 py-6">
		{#if loading}
			<div class="flex flex-1 flex-col items-center justify-center py-20">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
				></div>
				<p class="mt-4 text-sm text-surface-800-200">Verificando sessão...</p>
			</div>
		{:else}
			<div class="flex flex-col items-center text-center">
				<span class="flex h-24 w-24 items-center justify-center rounded-container border border-surface-200-800 bg-surface-50-950 shadow-md">
					<img src="/logo_black.png" alt="Logo Osiris" class="h-16 w-16 object-contain" />
				</span>
				<p class="mt-4 text-primary-700-300 preset-typo-label">Marketplace Osiris</p>
				<h1 class="mt-1 preset-typo-headline">Entre no Osiris</h1>
				<p class="mt-2 preset-typo-subtitle">
					Entre para anunciar, negociar e gerenciar seu inventário no agro.
				</p>
			</div>

			<div class="mt-6 rounded-container border border-surface-200-800 bg-surface-50-950 p-5 shadow-sm">
				{#if errorMessage}
					<div class="mb-4 flex items-start gap-2 rounded-container preset-tonal-error p-3 text-sm">
						<CircleAlert class="h-5 w-5 shrink-0" />
						{errorMessage}
					</div>
				{/if}

				<button
					type="button"
					onclick={handleGoogleLogin}
					disabled={signingIn}
					class="btn btn-lg preset-outlined-surface-200-800 w-full"
				>
					{#if signingIn}
						<span
							class="h-5 w-5 animate-spin rounded-full border-2 border-surface-200-800 border-t-primary-500"
						></span>
						<span>Conectando...</span>
					{:else}
						<img
							src="https://www.google.com/favicon.ico"
							alt=""
							class="h-6 w-6"
							width="24"
							height="24"
						/>
						<span>Continuar com Google</span>
					{/if}
				</button>

				<p class="mt-4 text-center text-sm leading-relaxed text-surface-800-200">
					Ao continuar, você concorda com os
					<a href={resolve('/termos')} class="font-semibold text-primary-700-300 underline">Termos de uso</a>
					e a
					<a href={resolve('/privacidade')} class="font-semibold text-primary-700-300 underline">Política de privacidade</a>
					do Osiris.
				</p>
			</div>

			<div class="mt-5 rounded-container bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-primary-50 shadow-md">
				<p class="opacity-90 preset-typo-label text-inherit">Por que entrar?</p>
				<ul class="mt-3 space-y-3">
					{#each LOGIN_BENEFITS as benefit (benefit.label)}
						<li class="flex items-center gap-3 text-sm font-medium">
							<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-container bg-white/15">
								<benefit.icon class="h-5 w-5" />
							</span>
							{benefit.label}
						</li>
					{/each}
				</ul>
			</div>

			<a href={resolve('/')} class="btn preset-tonal-primary mx-auto mt-5">
				<span>Continuar sem entrar</span>
				<ArrowRight size={18} />
			</a>
		{/if}
	</main>

	<BottomNav active="mais" />
</div>
