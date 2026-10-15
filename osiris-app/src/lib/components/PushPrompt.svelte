<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Bell, X } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';
	import { enablePush, pushPermission, syncPushSubscription } from '$lib/push';
	import { showToast } from '$lib/components/ui/toast.js';

	// Pede a permissão de notificação com um toque (celulares bloqueiam o pedido automático)
	// e mantém a inscrição do aparelho em dia para quem já permitiu.

	const DISMISS_KEY = 'osiris-push-prompt-dispensado';

	let userId = $state(null);
	let permission = $state('unsupported');
	let dismissed = $state(false);
	let enabling = $state(false);

	const visible = $derived(
		Boolean(userId) && permission === 'default' && !dismissed && !page.url.pathname.startsWith('/boas-vindas')
	);

	function readDismissed() {
		try {
			return sessionStorage.getItem(DISMISS_KEY) === '1';
		} catch {
			return false;
		}
	}

	function dismiss() {
		dismissed = true;
		try {
			sessionStorage.setItem(DISMISS_KEY, '1');
		} catch {
			// sem storage: o aviso só volta ao recarregar
		}
	}

	async function handleEnable() {
		if (!userId || enabling) return;
		enabling = true;
		const ok = await enablePush(userId);
		permission = pushPermission();
		enabling = false;

		if (ok) {
			showToast('Notificações ativadas neste aparelho.');
		} else if (permission === 'denied') {
			showToast('As notificações foram bloqueadas. Libere nas configurações do navegador.');
		} else if (permission === 'granted') {
			showToast('Não foi possível ativar as notificações. Tente novamente.');
		}
	}

	function handleUser(user) {
		userId = user?.id ?? null;
		permission = pushPermission();
		if (userId && permission === 'granted') syncPushSubscription(userId);
	}

	onMount(() => {
		dismissed = readDismissed();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
			// fora do callback: chamadas ao Supabase dentro dele podem travar o cliente
			setTimeout(() => handleUser(session?.user ?? null), 0);
		});

		return () => subscription.unsubscribe();
	});
</script>

{#if visible}
	<div class="fixed inset-x-0 bottom-20 z-40 px-4">
		<div
			class="mx-auto flex max-w-md items-start gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-lg"
			role="region"
			aria-label="Ativar notificações"
		>
			<div class="rounded-full preset-tonal-primary p-2">
				<Bell class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<p class="text-sm font-semibold">Receba avisos no celular</p>
				<p class="text-sm opacity-70">Saiba na hora quando chegar uma proposta, mensagem ou mudança na operação.</p>
				<button
					type="button"
					class="btn btn-sm preset-filled-primary-500 mt-3"
					onclick={handleEnable}
					disabled={enabling}
				>
					{enabling ? 'Ativando...' : 'Ativar notificações'}
				</button>
			</div>
			<button type="button" class="btn-icon btn-icon-sm" aria-label="Agora não" onclick={dismiss}>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
