<script>
	import { resolve } from '$app/paths';
	import {
		Plus,
		Search,
		MoreVertical,
		Edit,
		Trash2,
		Tractor,
		Leaf,
		Pause,
		Play,
		ExternalLink,
		PackageOpen,
		CircleAlert,
		CircleCheck,
		Home
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import InventoryEditSheet from '$lib/components/InventoryEditSheet.svelte';
	import AppConfirmDialog from '$lib/components/ui/AppConfirmDialog.svelte';
	import AppMenu from '$lib/components/ui/AppMenu.svelte';
	import AppTabs from '$lib/components/ui/AppTabs.svelte';
	import AppTabsPanel from '$lib/components/ui/AppTabsPanel.svelte';
	import { supabase } from '$lib/supabase';
	import { MACHINE_OFFER_LABEL, categoryLabel, machineTypeLabel, rentalUnitSuffix, stockUnitLabel } from '$lib/pricing';
	import { formatBRL, formatNumber } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { requireUser } from '$lib/auth';
	import { onMount } from 'svelte';

	function pickCoverImage(images = []) {
		if (!images?.length) return null;
		const cover = images.find((img) => img.is_cover && img.url?.trim());
		return cover?.url?.trim() ?? images.find((img) => img.url?.trim())?.url?.trim() ?? null;
	}

	function resolveProductImageUrl(images = [], legacyImageUrl = null) {
		const fromGallery = pickCoverImage(images);
		if (fromGallery) return fromGallery;
		const legacy = legacyImageUrl?.trim?.() ?? legacyImageUrl;
		return legacy || null;
	}

	function coverUrlFromMap(imagesByProductId, productId, legacyImageUrl = null) {
		const images = imagesByProductId.get(productId) ?? [];
		return resolveProductImageUrl(images, legacyImageUrl);
	}

	async function fetchProductImagesByProductIds(productIds) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- mapa local, não é estado
		const map = new Map();
		if (!productIds?.length) return map;

		const uniqueIds = [...new Set(productIds.filter(Boolean))];
		const { data, error } = await supabase
			.from('product_images')
			.select('id, product_id, url, is_cover, created_at')
			.in('product_id', uniqueIds)
			.order('is_cover', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Erro ao carregar product_images:', error);
			return map;
		}

		for (const row of data ?? []) {
			if (!map.has(row.product_id)) map.set(row.product_id, []);
			map.get(row.product_id).push(row);
		}

		return map;
	}

	function isActiveStatus(status) {
		const normalized = (status ?? '').toString().toLowerCase();
		return normalized === 'ativo';
	}

	function isPausedStatus(status) {
		const normalized = (status ?? '').toString().toLowerCase();
		return normalized === 'pausado' || normalized === 'pausada';
	}

	function getStatusLabel(status) {
		if (isActiveStatus(status)) return m.anunciar_status_ativo();
		if (isPausedStatus(status)) return m.anunciar_status_pausado();
		return status || '—';
	}

	function getNextStatus(status) {
		return isActiveStatus(status) ? 'pausado' : 'ativo';
	}

	function getMachineryFromProduct(product) {
		const machinery = product?.agricultural_machinery;
		if (!machinery) return null;
		return Array.isArray(machinery) ? machinery[0] : machinery;
	}

	async function fetchOwnerProducts(ownerId) {
		return supabase
			.from('products')
			.select(
				`
			id,
			name,
			description,
			status,
			price,
			category,
			quantity,
			stock_unit,
			created_at,
			updated_at,
			municipio_id,
			brand_name,
			min_order,
			delivery,
			cultivar,
			harvest,
			municipio:municipios (codigo_ibge, nome, uf),
			agricultural_machinery (
				id,
				brand_id,
				type_id,
				model,
				serial_number,
				manufacture_year,
				current_horimeter,
				offer_type,
				rental_unit,
				operator_included,
				condition,
				power_hp,
				traction,
				machinery_types (name),
				brands (name)
			)
		`
			)
			.eq('owner_id', ownerId)
			.order('created_at', { ascending: false });
	}

	async function updateProductStatus(productId, status) {
		return supabase
			.from('products')
			.update({ status, updated_at: new Date().toISOString() })
			.eq('id', productId);
	}

	const inventoryTabs = $derived([
		{ value: 'maquinarios', label: m.anunciar_inv_tab_maquinas({ n: maquinarios.length }), icon: Tractor },
		{ value: 'produtos', label: m.anunciar_inv_tab_produtos({ n: produtos.length }), icon: Leaf }
	]);

	let activeTab = $state('maquinarios');
	let searchQuery = $state('');

	let loading = $state(true);
	let statusMessage = $state({ text: '', type: '' });
	let maquinarios = $state([]);
	let produtos = $state([]);

	let brands = $state([]);
	let types = $state([]);

	let editOpen = $state(false);
	let editingProduct = $state(null);
	let togglingId = $state(null);

	let statusConfirmOpen = $state(false);
	let statusConfirmItem = $state(null);
	let statusConfirmLoading = $state(false);

	let deleteConfirmOpen = $state(false);
	let deleteConfirmItem = $state(null);
	let deleteConfirmLoading = $state(false);
	let deletingId = $state(null);

	const statusConfirmContent = $derived.by(() => {
		if (!statusConfirmItem) return null;

		const nextStatus = getNextStatus(statusConfirmItem.status);
		const isPausing = nextStatus === 'pausado';

		return {
			nextStatus,
			title: isPausing ? m.anunciar_inv_pausar_titulo() : m.anunciar_inv_ativar_titulo(),
			message: isPausing
				? m.anunciar_inv_pausar_msg({ nome: statusConfirmItem.name })
				: m.anunciar_inv_ativar_msg({ nome: statusConfirmItem.name }),
			confirmLabel: isPausing ? m.anunciar_inv_pausar() : m.anunciar_inv_ativar(),
			variant: isPausing ? 'warning' : 'default'
		};
	});

	const deleteConfirmContent = $derived.by(() => {
		if (!deleteConfirmItem) return null;

		return {
			title: m.anunciar_inv_excluir_titulo(),
			message: m.anunciar_inv_excluir_msg({ nome: deleteConfirmItem.name }),
			confirmLabel: m.anunciar_inv_excluir_anuncio(),
			variant: 'danger'
		};
	});

	onMount(async () => {
		const [{ data: bData }, { data: tData }] = await Promise.all([
			supabase.from('brands').select('id, name').order('name'),
			supabase.from('machinery_types').select('id, name').order('name')
		]);
		if (bData) brands = bData;
		if (tData) types = tData;
		await loadAllAds();
	});

	async function loadAllAds() {
		loading = true;
		statusMessage = { text: '', type: '' };

		const user = await requireUser('/inventario');
		if (!user) return;

		const { data: allAds, error } = await fetchOwnerProducts(user.id);

		if (error) {
			console.error('Erro ao buscar anúncios:', error);
			statusMessage = { text: m.anunciar_inv_erro_carregar(), type: 'error' };
			maquinarios = [];
			produtos = [];
		} else if (allAds) {
			const imagesByProductId = await fetchProductImagesByProductIds(
				allAds.map((ad) => ad.id)
			);

			const enrich = (ad) => ({
				...ad,
				coverUrl: coverUrlFromMap(imagesByProductId, ad.id)
			});

			maquinarios = allAds.filter((ad) => ad.category === 'Maquinário').map(enrich);
			produtos = allAds.filter((ad) => ad.category !== 'Maquinário').map(enrich);
		}

		loading = false;
	}

	function normalizeQuery(value) {
		return (value ?? '').toString().trim().toLowerCase();
	}

	const filteredMaquinarios = $derived(
		maquinarios.filter((item) => normalizeQuery(item.name).includes(normalizeQuery(searchQuery)))
	);

	const filteredProdutos = $derived(
		produtos.filter((item) => normalizeQuery(item.name).includes(normalizeQuery(searchQuery)))
	);

	function formatPrice(value) {
		if (!value) return m.comum_preco_a_combinar();
		return formatBRL(value);
	}

	function statusBadgeClass(status) {
		if (isActiveStatus(status)) return 'preset-tonal-primary';
		if (isPausedStatus(status)) return 'preset-tonal-warning';
		return 'preset-tonal-surface';
	}

	function getMachineryTypeName(item) {
		const machinery = getMachineryFromProduct(item);
		return machineTypeLabel(machinery?.machinery_types?.name) || m.comum_maquina();
	}

	function getAdCoverUrl(item) {
		return item?.coverUrl ?? null;
	}

	function getAdHref(item) {
		return item.category === 'Maquinário'
			? `/anuncio/maquinario/${item.id}`
			: `/anuncio/produto/${item.id}`;
	}

	function updateItemInLists(updatedItem) {
		const patch = (list) => list.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item));

		if (updatedItem.category === 'Maquinário') {
			maquinarios = patch(maquinarios);
			produtos = produtos.filter((item) => item.id !== updatedItem.id);
			if (!maquinarios.some((item) => item.id === updatedItem.id)) {
				maquinarios = [updatedItem, ...maquinarios];
			}
		} else {
			produtos = patch(produtos);
			maquinarios = maquinarios.filter((item) => item.id !== updatedItem.id);
			if (!produtos.some((item) => item.id === updatedItem.id)) {
				produtos = [updatedItem, ...produtos];
			}
		}
	}

	function openEdit(item) {
		editingProduct = item;
		editOpen = true;
	}

	function requestToggleStatus(item) {
		statusConfirmItem = item;
		statusConfirmOpen = true;
	}

	function cancelToggleStatus() {
		statusConfirmItem = null;
	}

	async function confirmToggleStatus() {
		if (!statusConfirmItem || !statusConfirmContent) return;

		const { nextStatus } = statusConfirmContent;
		const item = statusConfirmItem;

		statusConfirmLoading = true;
		togglingId = item.id;

		const { error } = await updateProductStatus(item.id, nextStatus);

		if (error) {
			statusMessage = {
				text: nextStatus === 'pausado' ? m.anunciar_inv_erro_pausar() : m.anunciar_inv_erro_ativar(),
				type: 'error'
			};
		} else {
			updateItemInLists({ ...item, status: nextStatus });
			statusMessage = {
				text: nextStatus === 'pausado' ? m.anunciar_inv_pausado_sucesso() : m.anunciar_inv_ativado_sucesso(),
				type: 'success'
			};
			statusConfirmOpen = false;
			statusConfirmItem = null;
		}

		statusConfirmLoading = false;
		togglingId = null;
	}

	function requestDelete(item) {
		deleteConfirmItem = item;
		deleteConfirmOpen = true;
	}

	function cancelDelete() {
		deleteConfirmItem = null;
	}

	async function deleteProductWithDependencies(productId) {
		const { data: negotiations } = await supabase
			.from('negotiations')
			.select('id')
			.eq('product_id', productId);

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
			.eq('product_id', productId);

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

		const childDeletes = await Promise.all([
			supabase.from('product_images').delete().eq('product_id', productId),
			supabase.from('agricultural_machinery').delete().eq('product_id', productId),
			supabase.from('favorites').delete().eq('product_id', productId)
		]);

		const childError = childDeletes.find((result) => result.error)?.error;
		if (childError) return childError;

		return supabase.from('products').delete().eq('id', productId);
	}

	function formatDeleteError(error) {
		if (error?.code === '23503' || error?.status === 409) {
			return m.anunciar_inv_erro_excluir_vinculos();
		}
		return m.anunciar_inv_erro_excluir();
	}

	async function confirmDelete() {
		if (!deleteConfirmItem) return;

		const id = deleteConfirmItem.id;

		deleteConfirmLoading = true;
		deletingId = id;

		const { error } = await deleteProductWithDependencies(id);

		if (error) {
			statusMessage = { text: formatDeleteError(error), type: 'error' };
		} else {
			maquinarios = maquinarios.filter((item) => item.id !== id);
			produtos = produtos.filter((item) => item.id !== id);
			statusMessage = { text: m.anunciar_inv_excluido(), type: 'success' };
			deleteConfirmOpen = false;
			deleteConfirmItem = null;
		}

		deleteConfirmLoading = false;
		deletingId = null;
	}

	function adMenuItems(item) {
		const active = isActiveStatus(item.status);
		return [
			{ value: 'ver', label: m.anunciar_inv_ver_anuncio(), icon: ExternalLink, href: getAdHref(item) },
			{ value: 'editar', label: m.comum_editar(), icon: Edit, onselect: () => openEdit(item) },
			{
				value: 'status',
				label: active ? m.anunciar_inv_pausar() : m.anunciar_inv_ativar(),
				icon: active ? Pause : Play,
				disabled: togglingId === item.id,
				onselect: () => requestToggleStatus(item)
			},
			{
				value: 'excluir',
				label: m.comum_excluir(),
				icon: Trash2,
				danger: true,
				separator: true,
				disabled: deletingId === item.id,
				onselect: () => requestDelete(item)
			}
		];
	}

	// resumo do topo (computador), só com o que já foi carregado
	const activeMachines = $derived(maquinarios.filter((item) => isActiveStatus(item.status)).length);
	const activeProducts = $derived(produtos.filter((item) => isActiveStatus(item.status)).length);

	const inventoryStats = $derived([
		{
			id: 'maquinas',
			label: m.anunciar_inv_stat_maquinas(),
			value: maquinarios.length,
			hint: (activeMachines === 1 ? m.anunciar_inv_maquina_ativa : m.anunciar_inv_maquinas_ativas)({ n: activeMachines }),
			icon: Tractor,
			tone: 'preset-tonal-primary'
		},
		{
			id: 'produtos',
			label: m.anunciar_inv_stat_produtos(),
			value: produtos.length,
			hint: (activeProducts === 1 ? m.anunciar_inv_produto_ativo : m.anunciar_inv_produtos_ativos)({ n: activeProducts }),
			icon: Leaf,
			tone: 'preset-tonal-tertiary'
		},
		{
			id: 'pausados',
			label: m.anunciar_inv_stat_pausados(),
			value: [...maquinarios, ...produtos].filter((a) => isPausedStatus(a.status)).length,
			hint: m.anunciar_inv_nao_aparecem(),
			icon: Pause,
			tone: 'preset-tonal-warning'
		}
	]);

	// linha de detalhes do anúncio no computador
	function adDetails(item, kind) {
		if (kind === 'maquinario') {
			const machinery = getMachineryFromProduct(item);
			return [
				[machinery?.brands?.name, machinery?.model].filter(Boolean).join(' '),
				machinery?.manufacture_year ? m.anunciar_inv_ano({ ano: machinery.manufacture_year }) : null,
				Number(machinery?.current_horimeter) > 0 ? `${formatNumber(machinery.current_horimeter)} h` : null
			]
				.filter(Boolean)
				.join(' · ');
		}
		return Number(item.quantity) > 0
			? m.anunciar_inv_estoque({ quantidade: formatNumber(item.quantity), unidade: stockUnitLabel(item.stock_unit, item.quantity) }).trim()
			: '';
	}

	const RENTAL_CAPTION = { hora: m.anunciar_inv_aluguel_hora, dia: m.anunciar_inv_aluguel_dia, hectare: m.anunciar_inv_aluguel_hectare };

	function priceCaption(item, kind) {
		if (kind !== 'maquinario') return m.anunciar_etapa_preco();
		const machinery = getMachineryFromProduct(item);
		if (machinery?.offer_type !== 'aluguel') return MACHINE_OFFER_LABEL.venda;
		return RENTAL_CAPTION[machinery.rental_unit]?.() ?? MACHINE_OFFER_LABEL.aluguel;
	}

	// unidade ao lado do preço: "/ hora", "/ dia", "/ ha" na máquina alugada; "/ saca" no insumo
	function priceSuffix(item, kind) {
		if (kind === 'maquinario') {
			const machinery = getMachineryFromProduct(item);
			return machinery?.offer_type === 'aluguel' ? rentalUnitSuffix(machinery.rental_unit) : '';
		}
		const unit = stockUnitLabel(item.stock_unit, 1);
		return unit ? `/ ${unit}` : '';
	}

	async function handleEditSaved() {
		await loadAllAds();
		statusMessage = { text: m.anunciar_inv_atualizado(), type: 'success' };
	}
</script>

<svelte:head>
	<title>{m.anunciar_inv_meu_inventario()} — Osiris</title>
</svelte:head>

{#snippet adCard(item, kind)}
	<article
		class="rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm transition-shadow hover:shadow-md"
	>
		<div class="flex gap-3 p-3 lg:items-center lg:gap-5 lg:p-4">
			<div
				class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-container lg:h-28 lg:w-36 {kind === 'maquinario'
					? 'preset-tonal-primary'
					: 'preset-tonal-tertiary'}  {isPausedStatus(item.status) ? 'grayscale' : ''}"
			>
				{#if getAdCoverUrl(item)}
					<img src={getAdCoverUrl(item)} alt={item.name} class="h-full w-full object-cover" />
				{:else if kind === 'maquinario'}
					<Tractor class="h-10 w-10 opacity-80" />
				{:else}
					<Leaf class="h-10 w-10 opacity-80" />
				{/if}
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<div class="flex items-start gap-1">
					<h3 class="line-clamp-2 min-w-0 flex-1 preset-typo-card-title lg:text-lg">{item.name}</h3>
					<div class="lg:hidden">
					<AppMenu
						items={adMenuItems(item)}
						label={m.anunciar_inv_acoes()}
						triggerClass="btn-icon btn-icon-lg preset-tonal -mr-1 -mt-1 shrink-0"
					>
						{#snippet trigger()}
							<MoreVertical size={18} />
						{/snippet}
					</AppMenu>
					</div>
				</div>
				<p class="text-lg font-bold leading-tight text-primary-700-300 lg:hidden">
					{formatPrice(item.price)}
					{#if priceSuffix(item, kind)}
						<span class="text-xs font-medium text-surface-800-200">{priceSuffix(item, kind)}</span>
					{/if}
				</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<span class="badge rounded-full bg-surface-100-900 px-2 py-1 uppercase text-surface-900-100 text-xs font-bold tracking-wide">
						{kind === 'maquinario' ? getMachineryTypeName(item) : categoryLabel(item.category)}
					</span>
					<span class="badge gap-1 rounded-full px-2 py-1 uppercase text-xs font-bold tracking-wide {statusBadgeClass(item.status)}">
						<span class="h-1.5 w-1.5 rounded-full bg-current"></span>
						{getStatusLabel(item.status)}
					</span>
				</div>
				{#if adDetails(item, kind)}
					<p class="mt-1.5 hidden preset-typo-caption lg:block">{adDetails(item, kind)}</p>
				{/if}
			</div>

			<!-- computador: preço com rótulo e ações à direita -->
			<div class="hidden shrink-0 text-right lg:block">
				<p class="preset-typo-label">{priceCaption(item, kind)}</p>
				<p class="text-2xl font-bold leading-tight text-primary-700-300">
					{formatPrice(item.price)}
					{#if priceSuffix(item, kind)}
						<span class="text-sm font-medium text-surface-800-200">{priceSuffix(item, kind)}</span>
					{/if}
				</p>
			</div>
			<div class="hidden shrink-0 items-center gap-2 lg:flex">
				<button type="button" onclick={() => openEdit(item)} class="btn preset-tonal">
					<Edit size={18} />
					<span>{m.comum_editar()}</span>
				</button>
				<AppMenu items={adMenuItems(item)} label={m.anunciar_inv_acoes()} triggerClass="btn-icon btn-icon-lg preset-tonal">
					{#snippet trigger()}
						<MoreVertical size={18} />
					{/snippet}
				</AppMenu>
			</div>
		</div>
	</article>
{/snippet}

{#snippet emptyState(message)}
	<div class="flex flex-col items-center rounded-container border border-dashed border-surface-300-700 bg-surface-50-950 px-4 py-10 text-center">
		<PackageOpen class="h-10 w-10 text-surface-700-300" />
		<p class="mt-3 text-base font-semibold text-surface-950-50">{message}</p>
		{#if !searchQuery.trim()}
			<a href={resolve('/anunciar')} class="btn preset-filled-primary-500 mt-4">
				<Plus size={18} />
				<span>{m.anunciar_inv_criar()}</span>
			</a>
		{/if}
	</div>
{/snippet}

<div class="min-h-screen pb-24">
	<Header title={m.anunciar_inv_meu_inventario()} />

	<main class="mx-auto w-full max-w-3xl px-4 py-4 lg:max-w-6xl lg:px-8 lg:py-6">
		<nav class="mb-3 hidden items-center gap-1.5 text-sm lg:flex" aria-label={m.anunciar_inv_caminho()}>
			<a href={resolve('/')} class="inline-flex items-center gap-1 text-surface-800-200 hover:text-primary-700-300">
				<Home size={16} />
				{m.nav_inicio()}
			</a>
			<span class="text-surface-700-300">/</span>
			<span class="font-semibold text-surface-950-50" aria-current="page">{m.anunciar_inv_meu_inventario()}</span>
		</nav>

		<div class="mb-4 flex items-center justify-between gap-3">
			<div class="min-w-0">
				<h1 class="preset-typo-headline">{m.anunciar_inv_meus_anuncios()}</h1>
				{#if !loading}
					<p class="preset-typo-subtitle">
						{(maquinarios.length + produtos.length === 1 ? m.anunciar_inv_cadastrado : m.anunciar_inv_cadastrados)({
							n: maquinarios.length + produtos.length
						})}
					</p>
				{/if}
			</div>
			<a
				href={resolve('/anunciar')}
				class="btn btn-md preset-filled-primary-500 shrink-0"
			>
				<Plus size={18} />
				<span class="lg:hidden">{m.anunciar_inv_novo()}</span>
				<span class="hidden lg:inline">{m.anunciar_novo_anuncio()}</span>
			</a>
		</div>

		<!-- computador: resumo do inventário (contagens dos anúncios já carregados) -->
		{#if !loading}
			<div class="mb-6 hidden grid-cols-3 gap-4 lg:grid">
				{#each inventoryStats as stat (stat.id)}
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
				<ListingSkeleton variant="stats" count={3} label={m.anunciar_inv_carregando_resumo()} />
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

		<AppTabs bind:value={activeTab} items={inventoryTabs} label={m.anunciar_inv_tipo_anuncio()} variant="segmented" class="gap-4">
			<div class="relative">
				<Search class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-700-300" />
				<input
					type="search"
					placeholder={m.anunciar_inv_buscar()}
					bind:value={searchQuery}
					class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 pl-11 pr-4 text-base shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>
			</div>

			{#if loading}
				<ListingSkeleton variant="list" count={3} label={m.anunciar_inv_carregando_anuncios()} />
			{:else}
				<AppTabsPanel value="maquinarios">
					<div class="space-y-3">
						{#each filteredMaquinarios as maq (maq.id)}
							{@render adCard(maq, 'maquinario')}
						{:else}
							{@render emptyState(m.anunciar_inv_nenhuma_maquina())}
						{/each}
					</div>
				</AppTabsPanel>
				<AppTabsPanel value="produtos">
					<div class="space-y-3">
						{#each filteredProdutos as prod (prod.id)}
							{@render adCard(prod, 'produto')}
						{:else}
							{@render emptyState(m.anunciar_inv_nenhum_produto())}
						{/each}
					</div>
				</AppTabsPanel>
			{/if}
		</AppTabs>
	</main>

	<InventoryEditSheet
		bind:open={editOpen}
		bind:product={editingProduct}
		{brands}
		{types}
		onsaved={handleEditSaved}
	/>

	<AppConfirmDialog
		bind:open={statusConfirmOpen}
		title={statusConfirmContent?.title ?? m.comum_confirmar()}
		message={statusConfirmContent?.message ?? ''}
		confirmLabel={statusConfirmContent?.confirmLabel ?? m.comum_confirmar()}
		cancelLabel={m.comum_cancelar()}
		variant={statusConfirmContent?.variant ?? 'default'}
		loading={statusConfirmLoading}
		onconfirm={confirmToggleStatus}
		oncancel={cancelToggleStatus}
	/>

	<AppConfirmDialog
		bind:open={deleteConfirmOpen}
		title={deleteConfirmContent?.title ?? m.anunciar_inv_excluir_titulo()}
		message={deleteConfirmContent?.message ?? ''}
		confirmLabel={deleteConfirmContent?.confirmLabel ?? m.comum_excluir()}
		cancelLabel={m.comum_cancelar()}
		variant="danger"
		loading={deleteConfirmLoading}
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>

	<SiteFooter />
	<BottomNav active="inventario" />
</div>
