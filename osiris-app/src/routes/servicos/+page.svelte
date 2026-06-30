<script>
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

	let activeTab = $state('mao_de_obra');
	let searchQuery = $state('');
	let loading = $state(true);
	let allServices = $state([]);
	let ownerProfile = $state(null);
	let statusMessage = $state({ text: '', type: '' });

	let openMenu = $state(null);
	let menuOpensUp = $state(false);
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
		if (isActiveStatus(status)) return 'bg-green-100 text-green-700';
		if (isPausedStatus(status)) return 'bg-amber-100 text-amber-700';
		return 'bg-gray-100 text-gray-600';
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

	function menuPositionClass() {
		return menuOpensUp
			? 'bottom-full mb-0.5 origin-bottom-right'
			: 'top-full mt-0.5 origin-top-right';
	}

	function toggleMenu(id, event) {
		event.preventDefault();
		event.stopPropagation();

		if (openMenu === id) {
			openMenu = null;
			return;
		}

		const trigger = event.currentTarget;
		if (trigger instanceof HTMLElement) {
			const rect = trigger.getBoundingClientRect();
			const menuHeight = 224;
			const bottomReserve = 112;
			const spaceBelow = window.innerHeight - rect.bottom - bottomReserve;
			menuOpensUp = spaceBelow < menuHeight;
		} else {
			menuOpensUp = false;
		}

		openMenu = id;
	}

	function handleWindowClick(event) {
		if (!openMenu) return;
		if (event.target instanceof Element && event.target.closest('[data-service-menu]')) {
			return;
		}
		openMenu = null;
	}

	function openEdit(service, event) {
		event.stopPropagation();
		openMenu = null;
		editingService = service;
		editOpen = true;
	}

	function requestToggleStatus(service, event) {
		event.stopPropagation();
		openMenu = null;
		statusConfirmItem = service;
		statusConfirmOpen = true;
	}

	function cancelToggleStatus() {
		statusConfirmItem = null;
	}

	function requestDelete(service, event) {
		event.stopPropagation();
		openMenu = null;
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

<svelte:window onclick={handleWindowClick} />

<div class="min-h-screen bg-gray-50 pb-20">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Meus Serviços</h1>
			<a
				href="/servicos/novo"
				class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
			>
				<Plus class="h-4 w-4" />
				Oferecer Serviço
			</a>
		</div>

		{#if statusMessage.text}
			<div
				class="mb-4 rounded-xl p-3 text-sm {statusMessage.type === 'error'
					? 'bg-red-50 text-red-700'
					: 'bg-green-50 text-green-700'}"
			>
				{statusMessage.text}
			</div>
		{/if}

		<div class="mb-6 flex rounded-xl bg-gray-200 p-1">
			<button
				type="button"
				onclick={() => (activeTab = 'mao_de_obra')}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all {activeTab ===
				'mao_de_obra'
					? 'bg-white text-green-700 shadow-sm'
					: 'text-gray-600 hover:text-gray-900'}"
			>
				<Users class="h-4 w-4" />
				Mão de Obra
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'pacote_completo')}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all {activeTab ===
				'pacote_completo'
					? 'bg-white text-green-700 shadow-sm'
					: 'text-gray-600 hover:text-gray-900'}"
			>
				<Briefcase class="h-4 w-4" />
				Pacote Completo
			</button>
		</div>

		<div class="relative mb-6 shadow-sm">
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<input
				type="search"
				placeholder="Buscar nos meus serviços..."
				bind:value={searchQuery}
				class="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
			/>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
			</div>
		{:else}
			<div class="space-y-3">
				{#each filteredServices as serv (serv.id)}
					{@const Icon = serviceIcon(serv)}
					<article
						class="relative rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md {isPausedStatus(
							serv.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg {serv.service_type ===
								'Pacote Completo'
									? 'bg-blue-50'
									: 'bg-green-50'}"
							>
								<Icon
									class="h-8 w-8 {serv.service_type === 'Pacote Completo'
										? 'text-blue-600'
										: 'text-green-600'} opacity-80"
								/>
							</div>

							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-gray-900">{serv.title}</h3>
								<p class="mt-0.5 text-sm font-medium text-green-700">
									{formatPrice(serv.price, serv.pricing_model)}
								</p>
								<p class="mt-1 line-clamp-2 text-xs text-gray-500">{serv.description}</p>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									<span
										class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {statusBadgeClass(
											serv.status
										)}"
									>
										{getStatusLabel(serv.status)}
									</span>
									<span class="flex items-center gap-1 text-xs text-gray-500">
										<MapPin class="h-3 w-3" />
										{serv.location}
									</span>
								</div>
								{#if ownerProfile}
									<div class="mt-2 flex items-center gap-2">
										<div class="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
											{#if ownerProfile.photo_url && !imgErrors[serv.id]}
												<img
													src={ownerProfile.photo_url}
													alt={ownerProfile.display_name}
													class="h-full w-full object-cover"
													onerror={() => (imgErrors[serv.id] = true)}
												/>
											{:else}
												<div
													class="flex h-full w-full items-center justify-center bg-green-100 text-xs font-bold text-green-700"
												>
													{ownerProfile.display_name?.charAt(0) || '?'}
												</div>
											{/if}
										</div>
										<span class="text-xs font-medium text-gray-700"
											>{ownerProfile.display_name || 'Usuário'}</span
										>
									</div>
								{/if}
							</div>

							<div class="relative z-10 shrink-0 self-start" data-service-menu>
								<button
									type="button"
									onclick={(event) => toggleMenu(serv.id, event)}
									class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
									aria-label="Ações do serviço"
									aria-expanded={openMenu === serv.id}
									aria-haspopup="menu"
								>
									<MoreVertical class="h-5 w-5" />
								</button>
								{#if openMenu === serv.id}
									<ul
										role="menu"
										tabindex="-1"
										class="absolute right-0 z-[60] m-0 w-48 list-none rounded-xl border border-gray-200 bg-white p-0 py-1 shadow-2xl {menuPositionClass()}"
									>
										<li role="none">
											<a
												role="menuitem"
												href={getServiceHref(serv)}
												class="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
											>
												<ExternalLink class="h-4 w-4" />
												Ver anúncio
											</a>
										</li>
										<li role="none">
											<button
												type="button"
												role="menuitem"
												onclick={(event) => openEdit(serv, event)}
												class="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
											>
												<Edit class="h-4 w-4" />
												Editar
											</button>
										</li>
										<li role="none">
											<button
												type="button"
												role="menuitem"
												disabled={togglingId === serv.id}
												onclick={(event) => requestToggleStatus(serv, event)}
												class="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
											>
												{#if isActiveStatus(serv.status)}
													<Pause class="h-4 w-4" />
													Pausar serviço
												{:else}
													<Play class="h-4 w-4" />
													Ativar serviço
												{/if}
											</button>
										</li>
										<li role="none">
											<button
												type="button"
												role="menuitem"
												disabled={deletingId === serv.id}
												onclick={(event) => requestDelete(serv, event)}
												class="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
											>
												<Trash2 class="h-4 w-4" />
												Excluir
											</button>
										</li>
									</ul>
								{/if}
							</div>
						</div>
					</article>
				{:else}
					<div class="px-4 py-16 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"
						>
							{#if activeTab === 'mao_de_obra'}
								<Users class="h-8 w-8 text-gray-400" />
							{:else}
								<Briefcase class="h-8 w-8 text-gray-400" />
							{/if}
						</div>
						<h3 class="mb-1 text-lg font-medium text-gray-900">Nenhum serviço encontrado</h3>
						<p class="text-sm text-gray-500">
							Você ainda não possui serviços cadastrados nesta categoria.
						</p>
					</div>
				{/each}
			</div>
		{/if}
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
