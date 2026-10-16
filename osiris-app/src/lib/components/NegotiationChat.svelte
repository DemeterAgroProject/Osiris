<script>
    import { onMount, tick } from 'svelte';
    import { Lock, MessageCircle, Send } from 'lucide-svelte';
    import { supabase } from '$lib/supabase';
    import { watchChanges } from '$lib/realtime';

    // hora da mensagem; de outro dia, mostra também a data
    function formatMessageTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (date.toDateString() === new Date().toDateString()) return time;
        return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${time}`;
    }

    let {
        negotiationId,
        currentUserId,
        providerId = null,
        disabled = false,
        onProviderMessage = () => {},
        // celular: o chat ocupa toda a altura do contêiner pai; a partir de md volta ao cartão com altura limitada
        fillOnMobile = false
    } = $props();

    const frameClass = $derived(
        fillOnMobile
            ? 'min-h-0 flex-1 md:min-h-[280px] md:flex-none md:rounded-container md:border md:border-surface-200-800'
            : 'min-h-[280px] rounded-container border border-surface-200-800'
    );
    const listClass = $derived(fillOnMobile ? 'min-h-0 p-4 md:max-h-[60vh] md:p-3' : 'max-h-[50vh] p-3');

    let messages = $state([]);
    let draft = $state('');
    let sending = $state(false);
    let loading = $state(true);
    let chatContainer = $state(null);

    // cache de perfis para não buscar o mesmo perfil várias vezes
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- cache interno, não é lido pela UI
    const profileCache = new Map();

    function resolveSenderName(msg) {
        return msg.sender?.display_name || 'Participante';
    }

    function isOwnMessage(msg) {
        return msg.sender_id === currentUserId;
    }

    async function fetchSenderProfile(senderId) {
        if (profileCache.has(senderId)) return profileCache.get(senderId);

        const { data } = await supabase
            .from('profiles')
            .select('display_name, photo_url')
            .eq('id', senderId)
            .maybeSingle();

        profileCache.set(senderId, data);
        return data;
    }

    async function scrollToBottom() {
        await tick();
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    async function loadMessages() {
        const { data, error } = await supabase
            .from('negotiation_messages')
            .select('id, content, created_at, sender_id')
            .eq('negotiation_id', negotiationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao carregar mensagens:', error);
            messages = [];
        } else {
            const rows = data ?? [];
            messages = await Promise.all(
                rows.map(async (row) => ({
                    ...row,
                    sender: await fetchSenderProfile(row.sender_id)
                }))
            );
            scrollToBottom();
        }
        loading = false;
    }

    // Adiciona uma única mensagem nova ao array, sem recarregar tudo
    async function appendMessage(row) {
        // evita duplicar se já existe (ex: a própria mensagem otimista)
        if (messages.some((m) => m.id === row.id)) return;

        const sender = await fetchSenderProfile(row.sender_id);
        messages = [...messages, { ...row, sender }];
        scrollToBottom();
    }

    async function sendMessage(event) {
        event.preventDefault();
        const content = draft.trim();
        if (!content || sending || disabled || !currentUserId) return;

        sending = true;
        draft = '';

        const { data, error } = await supabase
            .from('negotiation_messages')
            .insert({
                negotiation_id: negotiationId,
                sender_id: currentUserId,
                content
            })
            .select('id, content, created_at, sender_id')
            .single();

        if (!error && data) {
            // Atualização otimista: mostra a mensagem imediatamente
            await appendMessage(data);

            if (providerId && currentUserId === providerId) {
                onProviderMessage();
            }
        } else if (error) {
            console.error('Erro ao enviar mensagem:', error);
            draft = content; // devolve o texto pro usuário tentar de novo
        }

        sending = false;
    }

    onMount(() => {
        loadMessages();

        return watchChanges(
            `negotiation-${negotiationId}`,
            [{ event: 'INSERT', schema: 'public', table: 'negotiation_messages', filter: `negotiation_id=eq.${negotiationId}` }],
            (payload) => {
                // sem payload: a conexão caiu ou o app voltou do segundo plano, recarrega tudo
                if (!payload) loadMessages();
                // appendMessage já ignora duplicatas (própria mensagem otimista)
                else appendMessage(payload.new);
            }
        );
    });
</script>

<div class="flex flex-col overflow-hidden bg-surface-100-900 {frameClass}">
    <div bind:this={chatContainer} class="flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth {listClass}">
        {#if loading}
            <p class="py-8 text-center text-sm text-surface-900-100">Carregando mensagens...</p>
        {:else if messages.length === 0}
            <div class="flex flex-col items-center py-8 text-center text-surface-800-200">
                <MessageCircle class="h-8 w-8 opacity-60" />
                <p class="mt-2 text-sm">Nenhuma mensagem ainda. Envie a primeira!</p>
            </div>
        {:else}
            {#each messages as msg (msg.id)}
                {@const own = isOwnMessage(msg)}
                <div class="flex flex-col {own ? 'items-end' : 'items-start'}">
                    {#if !own}
                        <p class="mb-1 px-1 preset-typo-label">
                            {resolveSenderName(msg)}
                        </p>
                    {/if}
                    <div
                        class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-base shadow-sm {own
                            ? 'rounded-br-sm preset-filled-primary-500'
                            : 'rounded-bl-sm bg-surface-50-950 text-surface-950-50'}"
                    >
                        <p class="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{msg.content}</p>
                    </div>
                    {#if formatMessageTime(msg.created_at)}
                        <p class="mt-0.5 px-1 text-xs text-surface-800-200">{formatMessageTime(msg.created_at)}</p>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>

    {#if !disabled}
        <form
            class="flex shrink-0 items-center gap-2 border-t border-surface-200-800 bg-surface-50-950 p-2.5 {fillOnMobile ? 'pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:pb-2.5' : ''}"
            onsubmit={sendMessage}
        >
            <input
                type="text"
                bind:value={draft}
                placeholder="Digite sua mensagem..."
                aria-label="Mensagem"
                class="input h-12 min-w-0 flex-1 rounded-full border border-surface-200-800 bg-surface-100-900 px-4 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button
                type="submit"
                disabled={sending || !draft.trim()}
                class="btn-icon btn-icon-lg preset-filled-primary-500 shrink-0"
                title="Enviar mensagem"
                aria-label="Enviar mensagem"
            >
                <Send size={18} />
            </button>
        </form>
    {:else}
        <p class="flex shrink-0 items-center justify-center gap-2 border-t border-surface-200-800 bg-surface-50-950 p-3 text-center text-sm text-surface-900-100 {fillOnMobile ? 'pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3' : ''}">
            <Lock class="h-4 w-4" />
            Chat encerrado para esta negociação.
        </p>
    {/if}
</div>
