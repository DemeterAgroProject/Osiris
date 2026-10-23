<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { requireUser } from '$lib/auth';
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
		ExternalLink,
		CircleAlert,
		CircleCheck,
		Home
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import AppConfirmDialog from '$lib/components/ui/AppConfirmDialog.svelte';
	import AppMenu from '$lib/components/ui/AppMenu.svelte';
	import AppTabs from '$lib/components/ui/AppTabs.svelte';
	import AppTabsPanel from '$lib/components/ui/AppTabsPanel.svelte';
	import ServiceEditSheet from '$lib/components/ServiceEditSheet.svelte';
	import { m } from '$lib/paraglide/messages';
	import { formatBRL } from '$lib/i18n';

	const serviceTabs = [
		{ value: 'mao_de_obra', label: m.busca_mao_de_obra(), icon: Users },
		{ value: 'pacote_completo', label: m.busca_pacote_completo(), icon: Briefcase }
	];

	let activeTab = $state('mao_de_obra');
	let searchQuery = $state('');
	let loading = $state(true);
	let allServices = $state([]);
	let statusMessage = $state({ text: '', type: '' });

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
			title: isPausing ? m.busca_srv_pausar_titulo() : m.busca_srv_ativar_titulo(),
			message: isPausing
				? m.busca_srv_pausar_msg({ titulo: statusConfirmItem.title })
				: m.busca_srv_ativar_msg({ titulo: statusConfirmItem.title }),
			confirmLabel: isPausing ? m.busca_srv_pausar() : m.busca_srv_ativar(),
			variant: isPausing ? 'warning' : 'default'
		};
	});

	const deleteConfirmContent = $derived.by(() => {
		if (!deleteConfirmItem) return null;

		return {
			title: m.busca_srv_excluir_titulo(),
			message: m.busca_srv_excluir_msg({ titulo: deleteConfirmItem.title }),
			confirmLabel: m.busca_srv_excluir(),
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
		if (isActiveStatus(status)) return m.busca_status_ativo();
		if (isPausedStatus(status)) return m.busca_status_pausado();
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

	// unidade depois do valor, conforme o modelo de cobrança gravado no banco (em português)
	const PRICE_SUFFIX = {
		'Por Hora': () => ` / ${m.busca_unidade_hora()}`,
		'Por Hectare': () => ' / ha'
	};

	function formatPrice(price, model) {
		if (!price) return m.busca_a_combinar();
		const formatted = formatCurrencyOnly(price);
		if (!model || model === 'Fixo' || model === 'Empreitada/Fixo' || model === 'A Combinar') return formatted;
		return `${formatted}${PRICE_SUFFIX[model]?.() ?? ` / ${model}`}`;
	}

	// rótulo do valor no computador, conforme o modelo de cobrança (services_pricing_model_check);
	// guarda a função da mensagem
	const PRICING_CAPTION = {
		'Por Hora': m.busca_cobranca_por_hora,
		'Por Hectare': m.busca_cobranca_por_hectare,
		'Empreitada/Fixo': m.busca_cobranca_valor_fechado,
		'A Combinar': m.busca_a_combinar
	};

	function formatCurrencyOnly(price) {
		return formatBRL(price);
	}

	function activeCountLabel(list) {
		const n = list.filter((serv) => isActiveStatus(serv.status)).length;
		return n === 1 ? m.busca_n_ativo({ n }) : m.busca_n_ativos({ n });
	}

	// resumo do topo (computador), só com o que já foi carregado
	const serviceStats = $derived.by(() => {
		const labor = allServices.filter((serv) => serv.service_type === 'Mão de Obra');
		const packages = allServices.filter((serv) => serv.service_type === 'Pacote Completo');
		return [
			{
				label: m.busca_mao_de_obra(),
				value: labor.length,
				hint: activeCountLabel(labor),
				icon: Users,
				tone: 'preset-tonal-primary'
			},
			{
				label: m.busca_pacote_completo(),
				value: packages.length,
				hint: activeCountLabel(packages),
				icon: Briefcase,
				tone: 'preset-tonal-secondary'
			},
			{
				label: m.busca_pausados(),
				value: allServices.filter((serv) => isPausedStatus(serv.status)).length,
				hint: m.busca_nao_aparecem_busca(),
				icon: Pause,
				tone: 'preset-tonal-warning'
			}
		];
	});

	function openEdit(service) {
		editingService = service;
		editOpen = true;
	}

	function requestToggleStatus(service) {
		statusConfirmItem = service;
		statusConfirmOpen = true;
	}

	function cancelToggleStatus() {
		statusConfirmItem = null;
	}

	function requestDelete(service) {
		deleteConfirmItem = service;
		deleteConfirmOpen = true;
	}

	function cancelDelete() {
		deleteConfirmItem = null;
	}

	function serviceMenuItems(service) {
		const active = isActiveStatus(service.status);
		return [
			{ value: 'ver', label: m.busca_ver_anuncio(), icon: ExternalLink, href: getServiceHref(service) },
			{ value: 'editar', label: m.comum_editar(), icon: Edit, onselect: () => openEdit(service) },
			{
				value: 'status',
				label: active ? m.busca_srv_pausar() : m.busca_srv_ativar(),
				icon: active ? Pause : Play,
				disabled: togglingId === service.id,
				onselect: () => requestToggleStatus(service)
			},
			{
				value: 'excluir',
				label: m.comum_excluir(),
				icon: Trash2,
				danger: true,
				separator: true,
				disabled: deletingId === service.id,
				onselect: () => requestDelete(service)
			}
		];
	}

	async function fetchServices() {
		loading = true;
		statusMessage = { text: '', type: '' };

		const user = await requireUser('/servicos');
		if (!user) return;

		const { data, error } = await supabase
			.from('services')
			.select(
				'id, title, description, service_type, pricing_model, price, location, status, created_at, owner_id, image_url'
			)
			.eq('owner_id', user.id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Erro ao buscar serviços:', error);
			statusMessage = { text: m.busca_srv_erro_carregar(), type: 'error' };
			allServices = [];
		} else {
			allServices = data ?? [];
		}

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
			return m.busca_srv_erro_vinculos();
		}
		return m.busca_srv_erro_excluir();
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
				text: nextStatus === 'pausado' ? m.busca_srv_erro_pausar() : m.busca_srv_erro_ativar(),
				type: 'error'
			};
		} else {
			allServices = allServices.map((serv) =>
				serv.id === item.id ? { ...serv, status: nextStatus } : serv
			);
			statusMessage = {
				text: nextStatus === 'pausado' ? m.busca_srv_pausado_ok() : m.busca_srv_ativado_ok(),
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
			statusMessage = { text: m.busca_srv_excluido(), type: 'success' };
			deleteConfirmOpen = false;
			deleteConfirmItem = null;
		}

		deleteConfirmLoading = false;
		deletingId = null;
	}

	async function handleEditSaved() {
		await fetchServices();
		statusMessage = { text: m.busca_srv_atualizado(), type: 'success' };
	}

	onMount(() => {
		fetchServices();
	});
</script>

<svelte:head>
	<title>{m.busca_meus_servicos()} — Osiris</title>
</svelte:head>

{#snippet serviceList()}
	<div class="space-y-3">
		{#each filteredServices as serv (serv.id)}
			{@const Icon = serviceIcon(serv)}
			<article
				class="rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm transition-shadow hover:shadow-md"
			>
				<div class="flex gap-3 p-3 lg:items-center lg:gap-5 lg:p-4">
					{#if serv.image_url}
						<img
							src={serv.image_url}
							alt={serv.title}
							class="h-24 w-24 shrink-0 rounded-container object-cover lg:h-28 lg:w-36 {isPausedStatus(serv.status) ? 'grayscale' : ''}"
						/>
					{:else}
						<div
							class="flex h-24 w-24 shrink-0 items-center justify-center rounded-container lg:h-28 lg:w-36 {serv.service_type ===
							'Pacote Completo'
								? 'preset-tonal-secondary'
								: 'preset-tonal-primary'}"
						>
							<Icon class="h-10 w-10 opacity-80" />
						</div>
					{/if}

					<div class="flex min-w-0 flex-1 flex-col">
						<div class="flex items-start gap-1">
							<h3 class="line-clamp-2 min-w-0 flex-1 preset-typo-card-title lg:text-lg">{serv.title}</h3>
							<div class="lg:hidden">
								<AppMenu
									items={serviceMenuItems(serv)}
									label={m.busca_acoes_servico()}
									triggerClass="btn-icon btn-icon-lg preset-tonal -mr-1 -mt-1 shrink-0"
								>
									{#snippet trigger()}
										<MoreVertical size={18} />
									{/snippet}
								</AppMenu>
							</div>
						</div>
						<p class="text-lg font-bold leading-tight text-primary-700-300 lg:hidden">
							{formatPrice(serv.price, serv.pricing_model)}
						</p>
						{#if serv.description}
							<p class="mt-1 line-clamp-2 text-sm text-surface-800-200">{serv.description}</p>
						{/if}
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<span class="badge gap-1 rounded-full px-2 py-1 uppercase text-xs font-bold tracking-wide {statusBadgeClass(serv.status)}">
								<span class="h-1.5 w-1.5 rounded-full bg-current"></span>
								{getStatusLabel(serv.status)}
							</span>
							{#if serv.location}
								<span class="flex min-w-0 items-center gap-1 text-sm text-surface-900-100">
									<MapPin class="h-4 w-4 shrink-0 text-primary-600-400" />
									<span class="truncate">{serv.location}</span>
								</span>
							{/if}
						</div>
					</div>

					<!-- computador: valor com o modo de cobrança e ações à direita -->
					<div class="hidden shrink-0 text-right lg:block">
						<p class="preset-typo-label">{PRICING_CAPTION[serv.pricing_model]?.() ?? m.busca_valor()}</p>
						<p class="text-2xl font-bold leading-tight text-primary-700-300">
							{serv.price ? formatCurrencyOnly(serv.price) : m.busca_a_combinar()}
						</p>
					</div>
					<div class="hidden shrink-0 items-center gap-2 lg:flex">
						<button type="button" onclick={() => openEdit(serv)} class="btn preset-tonal">
							<Edit size={18} />
							<span>{m.comum_editar()}</span>
						</button>
						<AppMenu items={serviceMenuItems(serv)} label={m.busca_acoes_servico()} triggerClass="btn-icon btn-icon-lg preset-tonal">
							{#snippet trigger()}
								<MoreVertical size={18} />
							{/snippet}
						</AppMenu>
					</div>
				</div>
			</article>
		{:else}
			<div class="flex flex-col items-center rounded-container border border-dashed border-surface-300-700 bg-surface-50-950 px-4 py-10 text-center">
				<span class="flex h-16 w-16 items-center justify-center rounded-full preset-tonal-primary">
					{#if activeTab === 'mao_de_obra'}
						<Users class="h-8 w-8" />
					{:else}
						<Briefcase class="h-8 w-8" />
					{/if}
				</span>
				<h3 class="mt-3 text-base font-semibold text-surface-950-50">{m.busca_srv_nenhum()}</h3>
				<p class="mt-1 text-sm text-surface-800-200">
					{m.busca_srv_nenhum_texto()}
				</p>
				{#if !searchQuery.trim()}
					<a href={resolve('/servicos/novo')} class="btn preset-filled-primary-500 mt-4">
						<Plus size={18} />
						<span>{m.busca_oferecer_servico()}</span>
					</a>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

<div class="min-h-screen pb-24">
	<Header title={m.busca_meus_servicos()} />

	<main class="mx-auto w-full max-w-3xl px-4 py-4 lg:max-w-6xl lg:px-8 lg:py-6">
		<nav class="mb-3 hidden items-center gap-1.5 text-sm lg:flex" aria-label={m.busca_caminho()}>
			<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
				<Home size={16} />
				{m.nav_inicio()}
			</a>
			<span class="text-surface-700-300">/</span>
			<span class="font-semibold text-surface-950-50" aria-current="page">{m.busca_meus_servicos()}</span>
		</nav>

		<div class="mb-4 flex items-center justify-between gap-3">
			<div class="min-w-0">
				<h1 class="preset-typo-headline">{m.busca_meus_servicos()}</h1>
				<p class="preset-typo-subtitle">{m.busca_srv_subtitulo()}</p>
			</div>
			<a
				href={resolve('/servicos/novo')}
				class="btn btn-md preset-filled-primary-500 shrink-0"
			>
				<Plus size={18} />
				<span class="lg:hidden">{m.busca_oferecer()}</span>
				<span class="hidden lg:inline">{m.busca_oferecer_servico()}</span>
			</a>
		</div>

		<!-- computador: resumo dos serviços (contagens do que já foi carregado) -->
		{#if !loading}
			<div class="mb-6 hidden grid-cols-3 gap-4 lg:grid">
				{#each serviceStats as stat (stat.label)}
					<div class="flex items-center gap-4 rounded-container border border-surface-200-800 bg-surface-50-950 p-5 shadow-sm">
						<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-container {stat.tone}">
							<stat.icon size={24} />
						</span>
						<div class="min-w-0">
							<p class="preset-typo-label">{stat.label}</p>
							<p class="text-3xl font-bold leading-tight text-surface-950-50">{stat.value}</p>
							<p class="preset-typo-caption">{stat.hint}</p>
						</div>
					</div>
				{/each}
			</div>
		{:else if loading}
			<div class="mb-6 hidden lg:block">
				<ListingSkeleton variant="stats" count={3} label={m.busca_carregando_resumo()} />
			</div>
		{/if}

		{#if statusMessage.text}
			<div
				class="mb-4 flex items-start gap-2 rounded-container p-3 text-sm font-medium {statusMessage.type === 'error'
					? 'preset-tonal-error'
					: 'preset-tonal-success'}"
				role="status"
			>
				{#if statusMessage.type === 'error'}
					<CircleAlert class="h-5 w-5 shrink-0" />
				{:else}
					<CircleCheck class="h-5 w-5 shrink-0" />
				{/if}
				{statusMessage.text}
			</div>
		{/if}

		<AppTabs bind:value={activeTab} items={serviceTabs} label={m.busca_tipo_servico()} variant="segmented" class="gap-4">
			<div class="relative">
				<Search class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-700-300" />
				<input
					type="search"
					placeholder={m.busca_srv_buscar_placeholder()}
					aria-label={m.busca_srv_buscar_placeholder()}
					bind:value={searchQuery}
					class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-11 pr-4 text-base shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			{#if loading}
				<ListingSkeleton variant="list" count={3} label={m.busca_srv_carregando()} />
			{:else}
				<AppTabsPanel value="mao_de_obra">
					{@render serviceList()}
				</AppTabsPanel>
				<AppTabsPanel value="pacote_completo">
					{@render serviceList()}
				</AppTabsPanel>
			{/if}
		</AppTabs>
	</main>

	<ServiceEditSheet bind:open={editOpen} service={editingService} onsaved={handleEditSaved} />

	<AppConfirmDialog
		bind:open={statusConfirmOpen}
		title={statusConfirmContent?.title ?? ''}
		message={statusConfirmContent?.message ?? ''}
		confirmLabel={statusConfirmContent?.confirmLabel ?? m.comum_confirmar()}
		variant={statusConfirmContent?.variant ?? 'default'}
		loading={statusConfirmLoading}
		onconfirm={confirmToggleStatus}
		oncancel={cancelToggleStatus}
	/>

	<AppConfirmDialog
		bind:open={deleteConfirmOpen}
		title={deleteConfirmContent?.title ?? ''}
		message={deleteConfirmContent?.message ?? ''}
		confirmLabel={deleteConfirmContent?.confirmLabel ?? m.comum_excluir()}
		variant={deleteConfirmContent?.variant ?? 'danger'}
		loading={deleteConfirmLoading}
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>

	<SiteFooter />
	<BottomNav active="servicos" />
</div>
