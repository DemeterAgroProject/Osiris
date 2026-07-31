<script>
	import { goto } from '$app/navigation';
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
		ExternalLink
	} from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import InventoryEditSheet from '$lib/components/InventoryEditSheet.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListingSkeleton from '$lib/components/ListingSkeleton.svelte';
	import { Menu, Portal, Tabs } from '@skeletonlabs/skeleton-svelte';
	import { supabase } from '$lib/supabase';
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
		if (isActiveStatus(status)) return 'Ativo';
		if (isPausedStatus(status)) return 'Pausado';
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
			agricultural_machinery (
				id,
				brand_id,
				type_id,
				model,
				serial_number,
				manufacture_year,
				current_horimeter,
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
			title: isPausing ? 'Pausar anúncio?' : 'Ativar anúncio?',
			message: isPausing
				? `"${statusConfirmItem.name}" deixará de aparecer na busca até você ativá-lo novamente.`
				: `"${statusConfirmItem.name}" voltará a aparecer na busca do marketplace.`,
			confirmLabel: isPausing ? 'Pausar anúncio' : 'Ativar anúncio',
			variant: isPausing ? 'warning' : 'default'
		};
	});

	const deleteConfirmContent = $derived.by(() => {
		if (!deleteConfirmItem) return null;

		return {
			title: 'Excluir anúncio?',
			message: `Tem certeza que deseja excluir "${deleteConfirmItem.name}"? Esta ação não pode ser desfeita.`,
			confirmLabel: 'Excluir anúncio',
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

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			maquinarios = [];
			produtos = [];
			loading = false;
			return;
		}

		const { data: allAds, error } = await fetchOwnerProducts(user.id);

		if (error) {
			console.error('Erro ao buscar anúncios:', error);
			statusMessage = { text: 'Não foi possível carregar seus anúncios.', type: 'error' };
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
		if (!value) return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
	}

	function statusBadgeClass(status) {
		if (isActiveStatus(status)) return 'preset-tonal-primary';
		if (isPausedStatus(status)) return 'preset-tonal-warning';
		return 'preset-tonal-surface';
	}

	function getMachineryTypeName(item) {
		const machinery = getMachineryFromProduct(item);
		return machinery?.machinery_types?.name || 'Máquina';
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

	function openEdit(item, event) {
		event.stopPropagation();
		editingProduct = item;
		editOpen = true;
	}

	function requestToggleStatus(item, event) {
		event.stopPropagation();
		statusConfirmItem = item;
		statusConfirmOpen = true;
	}

	function cancelToggleStatus() {
		statusConfirmItem = null;
	}

	async function confirmToggleStatus() {
		if (!statusConfirmItem || !statusConfirmContent) return;

		const { nextStatus } = statusConfirmContent;
		const actionLabel = nextStatus === 'pausado' ? 'pausar' : 'ativar';
		const item = statusConfirmItem;

		statusConfirmLoading = true;
		togglingId = item.id;

		const { error } = await updateProductStatus(item.id, nextStatus);

		if (error) {
			statusMessage = { text: `Erro ao ${actionLabel} o anúncio.`, type: 'error' };
		} else {
			updateItemInLists({ ...item, status: nextStatus });
			statusMessage = {
				text: nextStatus === 'pausado' ? 'Anúncio pausado com sucesso.' : 'Anúncio ativado com sucesso.',
				type: 'success'
			};
			statusConfirmOpen = false;
			statusConfirmItem = null;
		}

		statusConfirmLoading = false;
		togglingId = null;
	}

	function requestDelete(item, event) {
		event.stopPropagation();
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
			return 'Não foi possível excluir: este anúncio ainda possui vínculos no sistema (reservas ou negociações).';
		}
		return 'Erro ao excluir o anúncio.';
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
			statusMessage = { text: 'Anúncio excluído.', type: 'success' };
			deleteConfirmOpen = false;
			deleteConfirmItem = null;
		}

		deleteConfirmLoading = false;
		deletingId = null;
	}

	async function handleEditSaved() {
		await loadAllAds();
		statusMessage = { text: 'Anúncio atualizado com sucesso.', type: 'success' };
	}
</script>

{#snippet inventoryActions(item)}
	<Menu positioning={{ placement: 'bottom-end', gutter: 4 }}>
		<Menu.Trigger
			type="button"
			class="flex size-9 shrink-0 items-center justify-center rounded-container text-surface-700-300 hover:bg-surface-100-900 hover:text-surface-700-300"
			aria-label="Ações do anúncio"
		>
			<MoreVertical class="size-5 shrink-0" />
		</Menu.Trigger>
		<Portal>
			<Menu.Positioner class="z-[60]">
				<Menu.Content class="w-48 rounded-container border border-surface-200-800 bg-surface-50-950 p-1 outline-none">
					<Menu.Item
						value={`view-${item.id}`}
						onclick={() => goto(getAdHref(item))}
						class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal"
					>
						<ExternalLink class="size-4 shrink-0" />
						<Menu.ItemText class="min-w-0">Ver anúncio</Menu.ItemText>
					</Menu.Item>
					<Menu.Item
						value={`edit-${item.id}`}
						onclick={(event) => openEdit(item, event)}
						class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal"
					>
						<Edit class="size-4 shrink-0" />
						<Menu.ItemText class="min-w-0">Editar</Menu.ItemText>
					</Menu.Item>
					<Menu.Item
						value={`status-${item.id}`}
						disabled={togglingId === item.id}
						onclick={(event) => requestToggleStatus(item, event)}
						class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm text-surface-700-300 hover:preset-tonal disabled:opacity-50"
					>
						{#if isActiveStatus(item.status)}
							<Pause class="size-4 shrink-0" />
							<Menu.ItemText class="min-w-0">Pausar anúncio</Menu.ItemText>
						{:else}
							<Play class="size-4 shrink-0" />
							<Menu.ItemText class="min-w-0">Ativar anúncio</Menu.ItemText>
						{/if}
					</Menu.Item>
					<Menu.Separator class="border-t border-surface-200-800" />
					<Menu.Item
						value={`delete-${item.id}`}
						disabled={deletingId === item.id}
						onclick={(event) => requestDelete(item, event)}
						class="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-center gap-3 rounded-container px-3 py-2.5 text-sm font-medium text-error-500 hover:preset-tonal-error disabled:opacity-50"
					>
						<Trash2 class="size-4 shrink-0" />
						<Menu.ItemText class="min-w-0">Excluir</Menu.ItemText>
					</Menu.Item>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu>
{/snippet}

<div class="min-h-screen  pb-20">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-surface-950-50">Meu Inventário</h1>
			<a
				href="/anunciar"
				class="flex items-center gap-2 rounded-container preset-filled-primary-500 px-4 py-2 text-sm font-medium "
			>
				<Plus class="h-4 w-4" />
				Novo Anúncio
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
			<Tabs.List class="relative flex gap-2" aria-label="Tipo de inventário">
			<Tabs.Trigger value="maquinarios" class="flex flex-1 items-center justify-center gap-2 rounded-container border border-surface-200-800 px-4 py-3 text-sm font-medium text-surface-700-300 transition-colors data-[selected]:border-primary-500 data-[selected]:preset-tonal-primary data-[selected]:text-primary-700">
				<Tractor class="h-5 w-5" />
				Maquinários
			</Tabs.Trigger>
			<Tabs.Trigger value="produtos" class="flex flex-1 items-center justify-center gap-2 rounded-container border border-surface-200-800 px-4 py-3 text-sm font-medium text-surface-700-300 transition-colors data-[selected]:border-primary-500 data-[selected]:preset-tonal-primary data-[selected]:text-primary-700">
				<Leaf class="h-5 w-5" />
				Produtos
			</Tabs.Trigger>
			<Tabs.Indicator class="absolute bottom-0 h-0.5 bg-primary-500" />
			</Tabs.List>

		<div class="relative mb-6  rounded-container">
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-700-300" />
			<input
				type="search"
				placeholder="Buscar nos meus anúncios..."
				bind:value={searchQuery}
				class="input w-full rounded-container border border-surface-200-800 bg-surface-50-950 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			/>
		</div>

		{#if loading}
			<ListingSkeleton variant="list" count={4} label="Carregando inventário..." />
		{:else if activeTab === 'maquinarios'}
			<Tabs.Content value="maquinarios">
			<div class="space-y-3">
				{#each filteredMaquinarios as maq (maq.id)}
					<article
						class="relative rounded-container border border-surface-200-800 bg-surface-50-950 transition-opacity {isPausedStatus(
							maq.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-container preset-tonal-primary">
								{#if getAdCoverUrl(maq)}
									<img src={getAdCoverUrl(maq)} alt={maq.name} class="h-full w-full object-cover" />
								{:else}
									<Tractor class="h-10 w-10 text-primary-600 opacity-80" />
								{/if}
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-surface-950-50">{maq.name}</h3>
								<p class="mt-0.5 text-sm font-medium text-primary-700">
									{formatPrice(maq.price)}
									<span class="text-xs font-normal text-surface-700-300">/hora</span>
								</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<span
										class="rounded-full bg-surface-100-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-surface-700-300"
									>
										{getMachineryTypeName(maq)}
									</span>
									<span
										class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {statusBadgeClass(
											maq.status
										)}"
									>
										{getStatusLabel(maq.status)}
									</span>
								</div>
							</div>
							<div class="relative z-10 shrink-0 self-start">
								{@render inventoryActions(maq)}
							</div>
						</div>
					</article>
				{:else}
					<div class="py-12 text-center text-surface-700-300">Nenhum maquinário encontrado.</div>
				{/each}
			</div>
			</Tabs.Content>
		{:else}
			<Tabs.Content value="produtos">
			<div class="space-y-3">
				{#each filteredProdutos as prod (prod.id)}
					<article
						class="relative rounded-container border border-surface-200-800 bg-surface-50-950 transition-opacity {isPausedStatus(
							prod.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-container preset-tonal-warning">
								{#if getAdCoverUrl(prod)}
									<img src={getAdCoverUrl(prod)} alt={prod.name} class="h-full w-full object-cover" />
								{:else}
									<Leaf class="h-10 w-10 text-warning-600 opacity-80" />
								{/if}
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-surface-950-50">{prod.name}</h3>
								<p class="mt-0.5 text-sm font-extrabold text-warning-700">{formatPrice(prod.price)}</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<span
										class="rounded-full bg-surface-100-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-surface-700-300"
									>
										{prod.category}
									</span>
									<span
										class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {statusBadgeClass(
											prod.status
										)}"
									>
										{getStatusLabel(prod.status)}
									</span>
								</div>
							</div>
							<div class="relative z-10 shrink-0 self-start">
								{@render inventoryActions(prod)}
							</div>
						</div>
					</article>
				{:else}
					<div class="py-12 text-center text-surface-700-300">Nenhum produto/insumo encontrado.</div>
				{/each}
			</div>
			</Tabs.Content>
		{/if}
		</Tabs>
	</main>

	<InventoryEditSheet
		bind:open={editOpen}
		bind:product={editingProduct}
		{brands}
		{types}
		onsaved={handleEditSaved}
	/>

	<ConfirmDialog
		bind:open={statusConfirmOpen}
		title={statusConfirmContent?.title ?? 'Confirmar'}
		message={statusConfirmContent?.message ?? ''}
		confirmLabel={statusConfirmContent?.confirmLabel ?? 'Confirmar'}
		cancelLabel="Cancelar"
		variant={statusConfirmContent?.variant ?? 'default'}
		loading={statusConfirmLoading}
		onconfirm={confirmToggleStatus}
		oncancel={cancelToggleStatus}
	/>

	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title={deleteConfirmContent?.title ?? 'Excluir anúncio?'}
		message={deleteConfirmContent?.message ?? ''}
		confirmLabel={deleteConfirmContent?.confirmLabel ?? 'Excluir'}
		cancelLabel="Cancelar"
		variant="danger"
		loading={deleteConfirmLoading}
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>

	<BottomNav active="inventario" />
</div>
