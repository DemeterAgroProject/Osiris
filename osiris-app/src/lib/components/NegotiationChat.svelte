<script>
    import { onMount, tick } from 'svelte';
    import { Send } from 'lucide-svelte';
    import { supabase } from '$lib/supabase';
    
    let {
        negotiationId,
        currentUserId,
        providerId = null,
        disabled = false,
        onProviderMessage = () => {}
    } = $props();

    let messages = $state([]);
    let draft = $state('');
    let sending = $state(false);
    let loading = $state(true);
    let chatContainer = $state(null);

    // cache de perfis para não buscar o mesmo perfil várias vezes
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

        const channel = supabase
            .channel(`negotiation-${negotiationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'negotiation_messages',
                    filter: `negotiation_id=eq.${negotiationId}`
                },
                (payload) => {
                    // appendMessage já ignora duplicatas (própria mensagem otimista)
                    appendMessage(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    });
</script>

<div class="flex min-h-[280px] flex-col rounded-2xl border border-gray-200 bg-white">
    <div bind:this={chatContainer} class="flex-1 space-y-3 overflow-y-auto p-4 max-h-[50vh] scroll-smooth">
        {#if loading}
            <p class="text-center text-sm text-gray-400">Carregando mensagens...</p>
        {:else if messages.length === 0}
            <p class="text-center text-sm text-gray-400">Nenhuma mensagem ainda. Inicie o alinhamento.</p>
        {:else}
            {#each messages as msg (msg.id)}
                <div class="flex {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
                    <div
                        class="max-w-[85%] rounded-2xl px-3 py-2 text-sm {isOwnMessage(msg)
                            ? 'rounded-br-md bg-green-600 text-white'
                            : 'rounded-bl-md bg-gray-100 text-gray-800'}"
                    >
                        {#if !isOwnMessage(msg)}
                            <p class="mb-0.5 text-[10px] font-semibold uppercase opacity-70">
                                {resolveSenderName(msg)}
                            </p>
                        {/if}
                        <p class="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    {#if !disabled}
        <form class="flex gap-2 border-t border-gray-100 p-3" onsubmit={sendMessage}>
            <input
                type="text"
                bind:value={draft}
                placeholder="Digite sua mensagem..."
                class="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            <button
                type="submit"
                disabled={sending || !draft.trim()}
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                aria-label="Enviar mensagem"
            >
                <Send class="h-4 w-4" />
            </button>
        </form>
    {:else}
        <p class="border-t border-gray-100 p-3 text-center text-xs text-gray-400">
            Chat encerrado para esta negociação.
        </p>
    {/if}
</div>