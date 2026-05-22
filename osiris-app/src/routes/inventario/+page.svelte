<script>
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
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

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
	let openMenu = $state(null);

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
			maquinarios = allAds.filter((ad) => ad.category === 'Maquinário');
			produtos = allAds.filter((ad) => ad.category !== 'Maquinário');
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
		if (isActiveStatus(status)) return 'bg-green-100 text-green-700';
		if (isPausedStatus(status)) return 'bg-amber-100 text-amber-700';
		return 'bg-gray-100 text-gray-600';
	}

	function getMachineryTypeName(item) {
		const machinery = getMachineryFromProduct(item);
		return machinery?.machinery_types?.name || 'Máquina';
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
		openMenu = null;
		editingProduct = item;
		editOpen = true;
	}

	function requestToggleStatus(item, event) {
		event.stopPropagation();
		openMenu = null;
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
		openMenu = null;
		deleteConfirmItem = item;
		deleteConfirmOpen = true;
	}

	function cancelDelete() {
		deleteConfirmItem = null;
	}

	async function confirmDelete() {
		if (!deleteConfirmItem) return;

		const id = deleteConfirmItem.id;

		deleteConfirmLoading = true;
		deletingId = id;

		const { error } = await supabase.from('products').delete().eq('id', id);

		if (error) {
			statusMessage = { text: 'Erro ao excluir o anúncio.', type: 'error' };
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

	function toggleMenu(id, event) {
		event.preventDefault();
		event.stopPropagation();
		openMenu = openMenu === id ? null : id;
	}

	function handleWindowClick(event) {
		if (!openMenu) return;
		if (event.target instanceof Element && event.target.closest('[data-inventory-menu]')) {
			return;
		}
		openMenu = null;
	}

	async function handleEditSaved() {
		await loadAllAds();
		statusMessage = { text: 'Anúncio atualizado com sucesso.', type: 'success' };
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="min-h-screen bg-gray-50 pb-20">
	<Header />

	<main class="mx-auto w-full max-w-3xl px-4 py-4">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Meu Inventário</h1>
			<a
				href="/anunciar"
				class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
			>
				<Plus class="h-4 w-4" />
				Novo Anúncio
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

		<div class="mb-6 flex gap-2">
			<button
				type="button"
				onclick={() => (activeTab = 'maquinarios')}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all {activeTab ===
				'maquinarios'
					? 'border-green-600 bg-green-50 text-green-700'
					: 'border-gray-200 bg-white text-gray-500 hover:border-green-300'}"
			>
				<Tractor class="h-5 w-5" />
				Maquinários
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'produtos')}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all {activeTab ===
				'produtos'
					? 'border-green-600 bg-green-50 text-green-700'
					: 'border-gray-200 bg-white text-gray-500 hover:border-green-300'}"
			>
				<Leaf class="h-5 w-5" />
				Produtos
			</button>
		</div>

		<div class="relative mb-6 shadow-sm">
			<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
			<input
				type="search"
				placeholder="Buscar nos meus anúncios..."
				bind:value={searchQuery}
				class="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
			/>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
			</div>
		{:else if activeTab === 'maquinarios'}
			<div class="space-y-3">
				{#each filteredMaquinarios as maq (maq.id)}
					<article
						class="relative rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md {isPausedStatus(
							maq.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-green-50">
								<Tractor class="h-10 w-10 text-green-600 opacity-80" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-gray-900">{maq.name}</h3>
								<p class="mt-0.5 text-sm font-medium text-green-700">
									{formatPrice(maq.price)}
									<span class="text-xs font-normal text-gray-500">/hora</span>
								</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<span
										class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600"
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
							<div class="relative z-10 shrink-0 self-start" data-inventory-menu>
								<button
									type="button"
									onclick={(event) => toggleMenu(maq.id, event)}
									class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
									aria-label="Ações do anúncio"
									aria-expanded={openMenu === maq.id}
									aria-haspopup="menu"
								>
									<MoreVertical class="h-5 w-5" />
								</button>
								{#if openMenu === maq.id}
									<ul
										role="menu"
										tabindex="-1"
										class="absolute right-0 top-full z-50 m-0 mt-0.5 w-48 origin-top-right list-none rounded-xl border border-gray-200 bg-white p-0 py-1 shadow-2xl"
									>
										<li role="none">
											<a
												role="menuitem"
												href={getAdHref(maq)}
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
												onclick={(event) => openEdit(maq, event)}
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
												disabled={togglingId === maq.id}
												onclick={(event) => requestToggleStatus(maq, event)}
												class="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
											>
												{#if isActiveStatus(maq.status)}
													<Pause class="h-4 w-4" />
													Pausar anúncio
												{:else}
													<Play class="h-4 w-4" />
													Ativar anúncio
												{/if}
											</button>
										</li>
										<li role="none">
											<button
												type="button"
												role="menuitem"
												disabled={deletingId === maq.id}
												onclick={(event) => requestDelete(maq, event)}
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
					<div class="py-12 text-center text-gray-500">Nenhum maquinário encontrado.</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-3">
				{#each filteredProdutos as prod (prod.id)}
					<article
						class="relative rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md {isPausedStatus(
							prod.status
						)
							? 'opacity-80'
							: ''}"
					>
						<div class="flex gap-4 p-4">
							<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-amber-50">
								<Leaf class="h-10 w-10 text-amber-600 opacity-80" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col justify-center">
								<h3 class="line-clamp-1 font-bold text-gray-900">{prod.name}</h3>
								<p class="mt-0.5 text-sm font-extrabold text-amber-700">{formatPrice(prod.price)}</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<span
										class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600"
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
							<div class="relative z-10 shrink-0 self-start" data-inventory-menu>
								<button
									type="button"
									onclick={(event) => toggleMenu(prod.id, event)}
									class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
									aria-label="Ações do anúncio"
									aria-expanded={openMenu === prod.id}
									aria-haspopup="menu"
								>
									<MoreVertical class="h-5 w-5" />
								</button>
								{#if openMenu === prod.id}
									<ul
										role="menu"
										tabindex="-1"
										class="absolute right-0 top-full z-50 m-0 mt-0.5 w-48 origin-top-right list-none rounded-xl border border-gray-200 bg-white p-0 py-1 shadow-2xl"
									>
										<li role="none">
											<a
												role="menuitem"
												href={getAdHref(prod)}
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
												onclick={(event) => openEdit(prod, event)}
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
												disabled={togglingId === prod.id}
												onclick={(event) => requestToggleStatus(prod, event)}
												class="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
											>
												{#if isActiveStatus(prod.status)}
													<Pause class="h-4 w-4" />
													Pausar anúncio
												{:else}
													<Play class="h-4 w-4" />
													Ativar anúncio
												{/if}
											</button>
										</li>
										<li role="none">
											<button
												type="button"
												role="menuitem"
												disabled={deletingId === prod.id}
												onclick={(event) => requestDelete(prod, event)}
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
					<div class="py-12 text-center text-gray-500">Nenhum produto/insumo encontrado.</div>
				{/each}
			</div>
		{/if}
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
