<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-svelte';
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';

    let loading = $state(true);
    let bookings = $state([]);
    let currentDate = $state(new Date());
    
    // NOVO: Estados para o modal de cancelamento
    let showCancelModal = $state(false);
    let bookingToCancel = $state(null);
    
    let currentYear = $derived(currentDate.getFullYear());
    let currentMonth = $derived(currentDate.getMonth());

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    function formatDbDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    onMount(async () => {
        await loadBookings();
    });

    async function loadBookings() {
        loading = true;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id, start_date, end_date, status, total_price,
                    products (name),
                    services (title)
                `)
                .eq('provider_id', user.id);

            if (data) bookings = data;
            if (error) console.error("Erro ao carregar agenda:", error);
        }
        loading = false;
    }

    const calendarDays = $derived.by(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        let daysArray = [];
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysArray.push({ day: null, dateString: null, cellState: null });
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const monthStr = String(currentMonth + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateString = `${currentYear}-${monthStr}-${dayStr}`;
            
            const activeStatuses = ['pendente', 'em_operacao'];
            const dayBookings = bookings.filter(b => {
                return activeStatuses.includes(b.status) && dateString >= b.start_date && dateString <= b.end_date;
            });

            let cellState = 'livre'; 
            if (dayBookings.length > 1) {
                cellState = 'conflito'; 
            } else if (dayBookings.length === 1) {
                const s = dayBookings[0].status;
                cellState = s === 'em_operacao' ? 'confirmado' : 'pendente';
            }

            daysArray.push({ day, dateString, cellState });
        }
        
        return daysArray;
    });

    function changeMonth(direction) {
        currentDate = new Date(currentYear, currentMonth + direction, 1);
    }

    async function updateStatus(bookingId, newStatus) {
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', bookingId);

        if (!error) {
            await loadBookings();
        } else {
            alert("Erro ao atualizar status: " + error.message);
        }
    }

    // NOVO: Funções de controle do Modal
    function openCancelModal(booking) {
        bookingToCancel = booking;
        showCancelModal = true;
    }

    function closeCancelModal() {
        showCancelModal = false;
        bookingToCancel = null;
    }

    async function confirmCancellation() {
        if (bookingToCancel) {
            await updateStatus(bookingToCancel.id, 'cancelado');
            closeCancelModal();
        }
    }
</script>

<div class="min-h-screen bg-gray-50 pb-20">
    <Header />

    <main class="px-4 py-4 max-w-3xl mx-auto w-full space-y-6">
        <div>
            <h1 class="text-xl font-bold text-gray-900">Minha Agenda</h1>
            <p class="text-sm text-gray-500 mt-0.5">Gerencie a disponibilidade de suas máquinas e serviços.</p>
        </div>

        {#if loading}
            <div class="flex justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        {:else}
            <div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-gray-800 text-base">{monthNames[currentMonth]} {currentYear}</h2>
                    <div class="flex gap-1">
                        <button onclick={() => changeMonth(-1)} class="p-2 rounded-lg hover:bg-gray-100 border border-gray-200"><ChevronLeft class="h-4 w-4 text-gray-600" /></button>
                        <button onclick={() => changeMonth(1)} class="p-2 rounded-lg hover:bg-gray-100 border border-gray-200"><ChevronRight class="h-4 w-4 text-gray-600" /></button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr);" class="gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr);" class="gap-1">
                    {#each calendarDays as { day, cellState }}
                        <div 
                            style="aspect-ratio: 1 / 1;"
                            class="relative flex items-center justify-center rounded-lg text-sm transition-all border
                            {day ? (
                                cellState === 'conflito' ? 'bg-red-500 text-white font-bold border-red-600 shadow-sm' :
                                cellState === 'confirmado' ? 'bg-green-500 text-white font-bold border-green-600 shadow-sm' :
                                cellState === 'pendente' ? 'bg-amber-300 text-amber-900 font-bold border-amber-400 shadow-sm animate-pulse' :
                                'bg-white text-gray-900 border-gray-100'
                            ) : 'bg-transparent text-transparent border-none'}
                        ">
                            {day || ''}
                        </div>
                    {/each}
                </div>

                <div class="mt-4 flex flex-wrap gap-3 text-xs border-t border-gray-100 pt-3 justify-center font-medium">
                    <div class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-amber-300 border border-amber-400"></span> Pendente</div>
                    <div class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-green-500 border border-green-600"></span> Ocupado</div>
                    <div class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-red-500 border border-red-600"></span> Conflito</div>
                </div>
            </div>

            <div class="space-y-3">
                <h2 class="text-base font-bold text-gray-900">Solicitações Pendentes</h2>
                
                {#each bookings.filter(b => b.status === 'pendente') as req (req.id)}
                    {@const hasConflict = bookings.some(b => b.id !== req.id && !['cancelado', 'finalizada', 'bloqueado_prestador'].includes(b.status) && (req.start_date <= b.end_date && req.end_date >= b.start_date))}
                    
                    <div class="rounded-xl bg-white p-4 shadow-sm border {hasConflict ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'} flex flex-col justify-between gap-3">
                        <div class="flex items-start gap-3">
                            <div class="h-10 w-10 rounded-lg {hasConflict ? 'bg-red-50' : 'bg-amber-50'} flex items-center justify-center shrink-0">
                                <Calendar class="h-5 w-5 {hasConflict ? 'text-red-600' : 'text-amber-600'}" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <h3 class="font-bold text-gray-900 text-sm truncate">{req.products?.name || req.services?.title || 'Reserva'}</h3>
                                <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <Clock class="h-3 w-3" /> 
                                    De {formatDbDate(req.start_date)} até {formatDbDate(req.end_date)}
                                </p>
                            </div>
                        </div>

                        {#if hasConflict}
                            <div class="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs px-2.5 py-2 rounded-lg font-medium">
                                <AlertCircle class="h-4 w-4 shrink-0" />
                                Atenção: Você já possui atividades marcadas nestes dias!
                            </div>
                        {/if}

                        <div class="flex gap-2">
                            <a href="/operacoes/{req.id}" class="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-green-600 text-white rounded-lg py-2 hover:bg-green-700">
                                <CheckCircle2 class="h-3.5 w-3.5" /> Gerenciar
                            </a>
                            <button onclick={() => updateStatus(req.id, 'cancelado')} class="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg py-2 hover:bg-gray-50">
                                <XCircle class="h-3.5 w-3.5" /> Cancelar
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="text-center py-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-100">
                        Nenhuma solicitação pendente no momento.
                    </div>
                {/each}
            </div>

            <div class="space-y-3 p-0.5">
                <h2 class="text-base font-bold text-gray-900">Em operação</h2>
                
                {#each bookings.filter(b => b.status === 'em_operacao') as conf (conf.id)}
                    <div class="rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between gap-3">
                        <div class="flex items-start gap-3">
                            <div class="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                <Calendar class="h-5 w-5 text-green-600" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <h3 class="font-bold text-gray-900 text-sm truncate">{conf.products?.name || conf.services?.title || 'Reserva'}</h3>
                                <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <Clock class="h-3 w-3" /> 
                                    De {formatDbDate(conf.start_date)} até {formatDbDate(conf.end_date)}
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-2 border-t border-gray-50 pt-2">
                            <a
                                href="/operacoes/{conf.id}"
                                class="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-lg py-2 hover:bg-green-100"
                            >
                                Ver operação
                            </a>
                            <button 
                                onclick={() => openCancelModal(conf)} 
                                class="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-white border border-red-200 text-red-600 rounded-lg py-2 hover:bg-red-50 transition-colors"
                            >
                                <XCircle class="h-3.5 w-3.5" /> Cancelar
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="text-center py-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-100">
                        Nenhum compromisso confirmado na agenda.
                    </div>
                {/each}
            </div>
        {/if}
    </main>

    <BottomNav active="inicio" />
</div>

{#if showCancelModal}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertCircle class="h-7 w-7 text-red-600" />
            </div>
            <h3 class="text-lg font-bold text-gray-900">Cancelar Atividade?</h3>
            <p class="mt-2 text-sm text-gray-500">
                Tem certeza que deseja cancelar esta atividade? As datas serão imediatamente liberadas no seu calendário para novos agendamentos.
            </p>
            
            <div class="mt-6 flex gap-3">
                <button
                    onclick={closeCancelModal}
                    class="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Voltar
                </button>
                <button
                    onclick={confirmCancellation}
                    class="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                    Sim, cancelar
                </button>
            </div>
        </div>
    </div>
{/if}