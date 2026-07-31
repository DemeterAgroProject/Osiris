<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import {
		Search,
		Plus,
		Users,
		MapPin,
		Briefcase,
		MoreVertical,
		Edit,
		Trash2,
		Pause,
		Play,
		ExternalLink
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ServiceEditSheet from '$lib/components/ServiceEditSheet.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import { Menu, Portal, Tabs } from '@skeletonlabs/skeleton-svelte';

	let activeTab = $state('mao_de_obra');
	let searchQuery = $state('');
	let loading = $state(true);
	let allServices = $state([]);
	let ownerProfile = $state(null);
	let statusMessage = $state({ text: '', type: '' });

	let imgErrors = $state({});

	let editOpen = $state(false);
	let editingService = $state(null);
	let togglingId = $state(null);
	let deletingId = $state(null);

	let statusConfirmOpen = $state(false);
	let statusConfirmItem = $state(null);
	let statusConfirmLoading = $state(false);

	let deleteConfirmOpen = $state(false);
	let deleteConfirmItem = $state(null);
	let deleteConfirmLoading = $state(false);

	const statusConfirmContent = $derived.by(() => {
		if (!statusConfirmItem) return null;

		const nextStatus = getNextStatus(statusConfirmItem.status);
		const isPausing = nextStatus === 'pausado';

		return {
			nextStatus,
			title: isPausing ? 'Pausar serviço?' : 'Ativar serviço?',
			message: isPausing
				? `"${statusConfirmItem.title}" deixará de aparecer na busca até você ativá-lo novamente.`
				: `"${statusConfirmItem.title}" voltará a aparecer na busca do marketplace.`,
			confirmLabel: isPausing ? 'Pausar serviço' : 'Ativar serviço',
			variant: isPausing ? 'warning' : 'default'
		};
	});

	const deleteConfirmContent = $derived.by(() => {
		if (!deleteConfirmItem) return null;

		return {
			title: 'Excluir serviço?',
			message: `Tem certeza que deseja excluir "${deleteConfirmItem.title}"? Esta ação não pode ser desfeita.`,
			confirmLabel: 'Excluir serviço',
			variant: 'danger'
		};
	});

	const filteredServices = $derived(
		allServices.filter((serv) => {
			const matchesTab =
				(activeTab === 'mao_de_obra' && serv.service_type === 'Mão de Obra') ||
				(activeTab === 'pacote_completo' && serv.service_type === 'Pacote Completo');

			const q = searchQuery.trim().toLowerCase();
			const matchesSearch =
				!q ||
				serv.title?.toLowerCase().includes(q) ||
				serv.description?.toLowerCase().includes(q);

			return matchesTab && matchesSearch;
		})
	);

	function isActiveStatus(status) {
		const normalized = (status ?? '').toString().toLowerCase();
		return normalized === 'ativo';
	}

	function isPausedStatus(status) {
		const normalized = (status ?? '').toString().toLowerCase();
		return normalized === 'pausado' || normalized === 'pausada';
	}

	function getStatusLabel(status) {
		if (isActiveStatus(status)) return 'Ativo';
		if (isPausedStatus(status)) return 'Pausado';
		return status || '—';
	}

	function getNextStatus(status) {
		return isActiveStatus(status) ? 'pausado' : 'ativo';
	}

	function statusBadgeClass(status) {
		if (isActiveStatus(status)) return 'preset-tonal-primary';
		if (isPausedStatus(status)) return 'preset-tonal-warning';
		return 'preset-tonal-surface';
	}

	function serviceIcon(service) {
		return service.service_type === 'Pacote Completo' ? Briefcase : Users;
	}

	function getServiceHref(service) {
		return `/anuncio/servico/${service.id}`;
	}

	function formatPrice(price, model) {
		if (!price) return 'A combinar';
		const formatted = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
		return `${formatted}${model !== 'Fixo' && model !== 'Empreitada/Fixo' && model !== 'A Combinar' ? ` / ${model}` : ''}`;
	}

	function openEdit(service, event) {
		event.stopPropagation();
		editingService = service;
		editOpen = true;
	}

	function requestToggleStatus(service, event) {
		event.stopPropagation();
		statusConfirmItem = service;
		statusConfirmOpen = true;
	}

	function cancelToggleStatus() {
		statusConfirmItem = null;
	}

	function requestDelete(service, event) {
		event.stopPropagation();
		deleteConfirmItem = service;
		deleteConfirmOpen = true;
	}

	function cancelDelete() {
		deleteConfirmItem = null;
	}

	async function fetchServices() {
		loading = true;
		statusMessage = { text: '', type: '' };

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			allServices = [];
			ownerProfile = null;
			loading = false;
			return;
		}

		const [{ data, error }, profileResult] = await Promise.all([
			supabase
				.from('services')
				.select(
					'id, title, description, service_type, pricing_model, price, location, status, created_at, owner_id'
				)
				.eq('owner_id', user.id)
				.order('created_at', { ascending: false }),
			supabase
				.from('profiles')
				.select('display_name, photo_url')
				.eq('id', user.id)
				.maybeSingle()
		]);

		if (error) {
			console.error('Erro ao buscar serviços:', error);
			statusMessage = { text: 'Não foi possível carregar seus serviços.', type: 'error' };
			allServices = [];
		} else {
			allServices = data ?? [];
		}

		ownerProfile = profileResult.data ?? null;
		loading = false;
	}

	async function updateServiceStatus(serviceId, status) {
		return supabase.from('services').update({ status }).eq('id', serviceId);
	}

	async function deleteServiceWithDependencies(serviceId) {
		const { data: negotiations } = await supabase
			.from('negotiations')
			.select('id')
			.eq('service_id', serviceId);

		const negotiationIds = (negotiations ?? []).map((row) => row.id);
		if (negotiationIds.length) {
			const { error } = await supabase
				.from('negotiation_messages')
				.delete()
				.in('negotiation_id', negotiationIds);
			if (error) return error;

			const { error: negotiationsError } = await supabase
				.from('negotiations')
				.delete()
				.in('id', negotiationIds);
			if (negotiationsError) return negotiationsError;
		}

		const { data: bookings } = await supabase
			.from('bookings')
			.select('id')
			.eq('service_id', serviceId);

		const bookingIds = (bookings ?? []).map((row) => row.id);
		if (bookingIds.length) {
			const { error: reviewsError } = await supabase
				.from('reviews')
				.delete()
				.in('booking_id', bookingIds);
			if (reviewsError) return reviewsError;

			const { error: bookingsError } = await supabase
				.from('bookings')
				.delete()
				.in('id', bookingIds);
			if (bookingsError) return bookingsError;
		}

		const { error: favoritesError } = await supabase
			.from('favorites')
			.delete()
			.eq('service_id', serviceId);
		if (favoritesError) return favoritesError;

		return supabase.from('services').delete().eq('id', serviceId);
	}

	function formatDeleteError(error) {
		if (error?.code === '23503' || error?.status === 409) {
			return 'Não foi possível excluir: este serviço ainda possui vínculos (negociações ou reservas).';
		}
		return 'Erro ao excluir o serviço.';
	}

	async function confirmToggleStatus() {
		if (!statusConfirmItem || !statusConfirmContent) return;

		const { nextStatus } = statusConfirmContent;
		const item = statusConfirmItem;

		statusConfirmLoading = true;
		togglingId = item.id;

		const { error } = await updateServiceStatus(item.id, nextStatus);

		if (error) {
			statusMessage = {
				text: nextStatus === 'pausado' ? 'Erro ao pausar o serviço.' : 'Erro ao ativar o serviço.',
				type: 'error'
			};
		} else {
			allServices = allServices.map((serv) =>
				serv.id === item.id ? { ...serv, status: nextStatus } : serv
			);
			statusMessage = {
				text: nextStatus === 'pausado' ? 'Serviço pausado com sucesso.' : 'Serviço ativado com sucesso.',
				type: 'success'
			};
			statusConfirmOpen = false;
			statusConfirmItem = null;
		}

		statusConfirmLoading = false;
		togglingId = null;
	}

	async function confirmDelete() {
		if (!deleteConfirmItem) return;

		const id = deleteConfirmItem.id;

		deleteConfirmLoading = true;
		deletingId = id;

		const { error } = await deleteServiceWithDependencies(id);

		if (error) {
			statusMessage = { text: formatDeleteError(error), type: 'error' };
		} else {
			allServices = allServices.filter((serv) => serv.id !== id);
			statusMessage = { text: 'Serviço excluído.', type: 'success' };
			deleteConfirmOpen = false;
			deleteConfirmItem = null;
		}

		deleteConfirmLoading = false;
		deletingId = null;
	}

	async function handleEditSaved() {
		await fetchServices();
		statusMessage = { text: 'Serviço atualizado com sucesso.', type: 'success' };
	}

	onMount(() => {
		fetchServices();
	});
</script>

<div class="min-h-screen bg-surface-50-950 pb-20">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-bold text-surface-950-50">Meus Serviços</h1>
			<a
				href="/servicos/novo"
				class="flex items-center gap-2 rounded-container preset-filled-primary-500 px-4 py-2 text-sm font-medium  transition-colors"
			>
				<Plus class="h-4 w-4" />
				Oferecer Serviço
			</a>
		</div>

		{#if statusMessage.text}
			<div
				class="mb-4 rounded-container p-3 text-sm {statusMessage.type === 'error'
					? 'preset-tonal-error'
					: 'preset-tonal-primary'}"
			>
				{statusMessage.text}
			</div>
		{/if}

		<Tabs value={activeTab} onValueChange={(details) => (activeTab = details.value)} class="mb-6">
			<Tabs.List class="relative flex rounded-container bg-surface-200-800 p-1" aria-label="Tipo de serviço">
			<Tabs.Trigger value="mao_de_obra" class="flex flex-1 items-center justify-center gap-2 rounded-container py-2.5 text-sm font-medium text-surface-700-300 transition-colors data-[selected]:bg-surface-50-950 data-[selected]:text-primary-700">
				<Users class="h-4 w-4" />
				Mão de Obra
			</Tabs.Trigger>
			<Tabs.Trigger value="pacote_completo" class="flex flex-1 items-center justify-center gap-2 rounded-container py-2.5 text-sm font-medium text-surface-700-300 transition-colors data-[selected]:bg-surface-50-950 data-[selected]:text-primary-700">
				<Briefcase class="h-4 w-4" />
				Pacote Completo
			</Tabs.Trigger>
			<Tabs.Indicator class="absolute bottom-0 h-0.5 bg-primary-500" />
			</Tabs.List>

		<div class="relative mb-6  rounded-container">
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-700-300" />
			<input
				type="search"
				placeholder="Buscar nos meus serviços..."
				bind:value={searchQuery}
				class="input w-full rounded-container border border-surface-200-800 bg-surface-50-950 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			/>
		</div>

		{#if loading}
			<ListingSkeleton variant="list" count={4} label="Carregando serviços..." />
		{:else}
			<Tabs.Content value={activeTab}>
			<div class="space-y-3">
				{#each filteredServices as serv (serv.id)}
					{@const Icon = serviceIcon(serv)}
					<article
						class="relative rounded-container border border-surface-200-800 bg-surface-50-950 transition-opacity {isPausedStatus(
							serv.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-container {serv.service_type ===
								'Pacote Completo'
									? 'preset-tonal-secondary'
									: 'preset-tonal-primary'}"
							>
								<Icon
									class="h-8 w-8 {serv.service_type === 'Pacote Completo'
										? 'text-secondary-600'
										: 'text-primary-600'} opacity-80"
								/>
							</div>

							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-surface-950-50">{serv.title}</h3>
								<p class="mt-0.5 text-sm font-medium text-primary-700">
									{formatPrice(serv.price, serv.pricing_model)}
								</p>
								<p class="mt-1 line-clamp-2 text-xs text-surface-700-300">{serv.description}</p>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									<span
										class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {statusBadgeClass(
											serv.status
										)}"
									>
										{getStatusLabel(serv.status)}
									</span>
									<span class="flex items-center gap-1 text-xs text-surface-700-300">
										<MapPin class="h-3 w-3" />
										{serv.location}
									</span>
								</div>
								{#if ownerProfile}
									<div class="mt-2 flex items-center gap-2">
										<div class="h-6 w-6 overflow-hidden rounded-full bg-surface-200-800">
											{#if ownerProfile.photo_url && !imgErrors[serv.id]}
												<img
													src={ownerProfile.photo_url}
													alt={ownerProfile.display_name}
													class="h-full w-full object-cover"
													onerror={() => (imgErrors[serv.id] = true)}
												/>
											{:else}
												<div
													class="flex h-full w-full items-center justify-center preset-tonal-primary text-xs font-bold"
												>
													{ownerProfile.display_name?.charAt(0) || '?'}
												</div>
											{/if}
										</div>
										<span class="text-xs font-medium text-surface-700-300"
											>{ownerProfile.display_name || 'Usuário'}</span
										>
									</div>
								{/if}
							</div>

							<div class="relative z-10 shrink-0 self-start">
								<Menu positioning={{ placement: 'bottom-end', gutter: 4 }}>
								<Menu.Trigger
									type="button"
									class="flex size-9 shrink-0 items-center justify-center rounded-container text-surface-700-300 hover:bg-surface-100-900 hover:text-surface-700-300"
									aria-label="Ações do serviço"
								>
									<MoreVertical class="size-5 shrink-0" />
								</Menu.Trigger>
								<Portal>
									<Menu.Positioner class="z-[60]">
									<Menu.Content class="w-48 rounded-container border border-surface-200-800 bg-surface-50-950 p-1 outline-none">
											<Menu.Item
												value={`view-${serv.id}`}
												onclick={() => goto(getServiceHref(serv))}
												class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal"
											>
												<ExternalLink class="size-4 shrink-0" />
												<Menu.ItemText class="min-w-0">Ver anúncio</Menu.ItemText>
											</Menu.Item>
											<Menu.Item
												value={`edit-${serv.id}`}
												onclick={(event) => openEdit(serv, event)}
												class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal"
											>
												<Edit class="size-4 shrink-0" />
												<Menu.ItemText class="min-w-0">Editar</Menu.ItemText>
											</Menu.Item>
											<Menu.Item
												value={`status-${serv.id}`}
												disabled={togglingId === serv.id}
												onclick={(event) => requestToggleStatus(serv, event)}
												class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal disabled:opacity-50"
											>
												{#if isActiveStatus(serv.status)}
													<Pause class="size-4 shrink-0" />
													<Menu.ItemText class="min-w-0">Pausar serviço</Menu.ItemText>
												{:else}
													<Play class="size-4 shrink-0" />
													<Menu.ItemText class="min-w-0">Ativar serviço</Menu.ItemText>
												{/if}
											</Menu.Item>
											<Menu.Separator class="border-t border-surface-200-800" />
											<Menu.Item
												value={`delete-${serv.id}`}
												disabled={deletingId === serv.id}
												onclick={(event) => requestDelete(serv, event)}
												class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm font-medium text-error-500 hover:preset-tonal-error disabled:opacity-50"
											>
												<Trash2 class="size-4 shrink-0" />
												<Menu.ItemText class="min-w-0">Excluir</Menu.ItemText>
											</Menu.Item>
									</Menu.Content>
									</Menu.Positioner>
								</Portal>
								</Menu>
							</div>
						</div>
					</article>
				{:else}
					<div class="px-4 py-16 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100-900"
						>
							{#if activeTab === 'mao_de_obra'}
								<Users class="h-8 w-8 text-surface-700-300" />
							{:else}
								<Briefcase class="h-8 w-8 text-surface-700-300" />
							{/if}
						</div>
						<h3 class="mb-1 text-lg font-medium text-surface-950-50">Nenhum serviço encontrado</h3>
						<p class="text-sm text-surface-700-300">
							Você ainda não possui serviços cadastrados nesta categoria.
						</p>
					</div>
				{/each}
			</div>
			</Tabs.Content>
		{/if}
		</Tabs>
	</main>

	<ServiceEditSheet bind:open={editOpen} service={editingService} onsaved={handleEditSaved} />

	<ConfirmDialog
		bind:open={statusConfirmOpen}
		title={statusConfirmContent?.title ?? ''}
		message={statusConfirmContent?.message ?? ''}
		confirmLabel={statusConfirmContent?.confirmLabel ?? 'Confirmar'}
		variant={statusConfirmContent?.variant ?? 'default'}
		loading={statusConfirmLoading}
		onconfirm={confirmToggleStatus}
		oncancel={cancelToggleStatus}
	/>

	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title={deleteConfirmContent?.title ?? ''}
		message={deleteConfirmContent?.message ?? ''}
		confirmLabel={deleteConfirmContent?.confirmLabel ?? 'Excluir'}
		variant={deleteConfirmContent?.variant ?? 'danger'}
		loading={deleteConfirmLoading}
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>

	<BottomNav active="servicos" />
</div>
