<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Bell, X } from 'lucide-svelte';
	import { supabase } from '$lib/supabase';
	import { enablePush, isBrave, pushFailureReason, pushPermission, syncPushSubscription } from '$lib/push';
	import { showToast } from '$lib/components/ui/toast.js';
	import { track } from '$lib/telemetry';
	import { m } from '$lib/paraglide/messages';

	// Pede a permissão de notificação com um toque (celulares bloqueiam o pedido automático)
	// e mantém a inscrição do aparelho em dia para quem já permitiu.

	const DISMISS_KEY = 'osiris-push-prompt-dispensado';

	let userId = $state(null);
	let permission = $state('unsupported');
	let dismissed = $state(false);
	let enabling = $state(false);
	// o Edge (e o Chrome, para quem já recusou antes) mostra o pedido só como um ícone na barra de endereço
	let permissionHint = $state(false);

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
		track('notificacoes_dispensadas');
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
		const hintTimer = setTimeout(() => (permissionHint = pushPermission() === 'default'), 3000);
		const ok = await enablePush(userId);
		clearTimeout(hintTimer);
		permissionHint = false;
		permission = pushPermission();
		enabling = false;
		track(ok ? 'notificacoes_ativadas' : 'notificacoes_falharam', {
			permissao: permission,
			motivo: ok ? undefined : (pushFailureReason() ?? undefined),
			brave: isBrave() || undefined
		});

		if (ok) {
			showToast(m.app_push_ativadas());
		} else if (permission === 'denied') {
			showToast(m.app_push_bloqueadas());
		} else if (permission === 'granted' && pushFailureReason() === 'push-service') {
			showToast(
				isBrave() ? m.app_push_brave() : m.app_push_servico_recusado()
			);
		} else if (permission === 'granted') {
			showToast(m.app_push_falhou());
		}
	}

	// o Supabase repete SIGNED_IN toda vez que a aba volta ao foco: sincroniza uma vez por conta
	let syncedUserId = null;

	function handleUser(user) {
		userId = user?.id ?? null;
		permission = pushPermission();
		if (userId && permission === 'granted' && userId !== syncedUserId) {
			syncedUserId = userId;
			syncPushSubscription(userId);
		}
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
			aria-label={m.app_push_ativar()}
		>
			<div class="rounded-full preset-tonal-primary p-2">
				<Bell class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<p class="text-sm font-semibold">{m.app_push_titulo()}</p>
				<p class="text-sm opacity-70">{m.app_push_desc()}</p>
				<button
					type="button"
					class="btn preset-filled-primary-500 mt-3"
					onclick={handleEnable}
					disabled={enabling}
				>
					<Bell size={18} />
					<span>{enabling ? m.app_push_ativando() : m.app_push_ativar()}</span>
				</button>
				{#if permissionHint}
					<p class="mt-2 text-xs opacity-80" role="status">
						{m.app_push_dica()} <b>{m.app_push_permitir()}</b>.
					</p>
				{/if}
			</div>
			<button type="button" class="btn-icon btn-icon-lg preset-tonal" title={m.app_push_agora_nao()} aria-label={m.app_push_agora_nao()} onclick={dismiss}>
				<X size={18} />
			</button>
		</div>
	</div>
{/if}
