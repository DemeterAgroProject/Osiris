<script>
	import { Package, Plus, MoreVertical, Edit, Trash2, Tractor, Leaf } from 'lucide-svelte';
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let activeTab = $state('maquinarios'); // Pode ser 'maquinarios' ou 'produtos'
	let searchQuery = $state('');
	let openMenu = $state(null);

	let loading = $state(true);
	let maquinarios = $state([]);
	let produtos = $state([]);
	let brands = $state([]);
	let types = $state([]);

	let filters = $state({
		status: '',
		sort: 'recentes',
		minPrice: '',
		maxPrice: '',
		brandIds: [],
		typeIds: [],
		categories: [],
		minYear: '',
		maxYear: '',
		minHorimeter: '',
		maxHorimeter: ''
	});

	onMount(async () => {
		await loadAllAds();
	});

	async function loadAllAds() {
		loading = true;
		const { data: { user } } = await supabase.auth.getUser();

		if (user) {
			// Faz as duas buscas simultaneamente no banco
			const [maqResponse, prodResponse] = await Promise.all([
				supabase
					.from('agricultural_machinery')
					.select('id, name, status, hourly_rate, brand_id, type_id, manufacture_year, current_horimeter, machinery_types(name)')
					.eq('owner_id', user.id)
					.order('created_at', { ascending: false }),

				supabase
					.from('products')
					.select('id, name, status, price, category')
					.eq('owner_id', user.id)
					.order('created_at', { ascending: false })
			]);

			if (maqResponse.data) maquinarios = maqResponse.data;
			if (prodResponse.data) produtos = prodResponse.data;

			const [brandsResponse, typesResponse] = await Promise.all([
				supabase.from('brands').select('id, name').order('name'),
				supabase.from('machinery_types').select('id, name').order('name')
			]);

			if (brandsResponse.data) brands = brandsResponse.data;
			if (typesResponse.data) types = typesResponse.data;
		}
		loading = false;
	}

	function normalizeText(value) {
		return (value ?? '').toString().trim().toLowerCase();
	}

	function parseOptionalNumber(value) {
		if (value === '' || value === null || value === undefined) return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	// Filtros reativos baseados na busca, aba ativa e filtros avançados
	const filteredMaquinarios = $derived.by(() => {
		const query = normalizeText(searchQuery);
		const minPrice = parseOptionalNumber(filters.minPrice);
		const maxPrice = parseOptionalNumber(filters.maxPrice);
		const minYear = parseOptionalNumber(filters.minYear);
		const maxYear = parseOptionalNumber(filters.maxYear);
		const minHorimeter = parseOptionalNumber(filters.minHorimeter);
		const maxHorimeter = parseOptionalNumber(filters.maxHorimeter);

		let list = maquinarios.filter((item) => {
			if (query && !normalizeText(item.name).includes(query)) return false;
			if (filters.status && item.status !== filters.status) return false;

			const itemPrice = Number(item.hourly_rate) || 0;
			if (minPrice !== null && itemPrice < minPrice) return false;
			if (maxPrice !== null && itemPrice > maxPrice) return false;

			if (filters.brandIds.length && !filters.brandIds.includes(item.brand_id)) return false;
			if (filters.typeIds.length && !filters.typeIds.includes(item.type_id)) return false;

			const year = Number(item.manufacture_year) || 0;
			if (minYear !== null && year < minYear) return false;
			if (maxYear !== null && year > maxYear) return false;

			const horimeter = Number(item.current_horimeter) || 0;
			if (minHorimeter !== null && horimeter < minHorimeter) return false;
			if (maxHorimeter !== null && horimeter > maxHorimeter) return false;

			return true;
		});

		switch (filters.sort) {
			case 'nome-asc':
				list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
				break;
			case 'nome-desc':
				list = [...list].sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
				break;
			case 'preco-asc':
				list = [...list].sort((a, b) => (Number(a.hourly_rate) || 0) - (Number(b.hourly_rate) || 0));
				break;
			case 'preco-desc':
				list = [...list].sort((a, b) => (Number(b.hourly_rate) || 0) - (Number(a.hourly_rate) || 0));
				break;
			default:
				break;
		}

		return list;
	});

	const filteredProdutos = $derived.by(() => {
		const query = normalizeText(searchQuery);
		const minPrice = parseOptionalNumber(filters.minPrice);
		const maxPrice = parseOptionalNumber(filters.maxPrice);

		let list = produtos.filter((item) => {
			if (query && !normalizeText(item.name).includes(query)) return false;
			if (filters.status && item.status !== filters.status) return false;

			const itemPrice = Number(item.price) || 0;
			if (minPrice !== null && itemPrice < minPrice) return false;
			if (maxPrice !== null && itemPrice > maxPrice) return false;

			if (filters.categories.length && !filters.categories.includes(item.category)) return false;

			return true;
		});

		switch (filters.sort) {
			case 'nome-asc':
				list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
				break;
			case 'nome-desc':
				list = [...list].sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
				break;
			case 'preco-asc':
				list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
				break;
			case 'preco-desc':
				list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
				break;
			default:
				break;
		}

		return list;
	});

	const brandFilterOptions = $derived(brands.map((brand) => ({ id: brand.id, label: brand.name })));
	const typeFilterOptions = $derived(types.map((type) => ({ id: type.id, label: type.name })));
	const categoryFilterOptions = $derived(
		[...new Set(produtos.map((item) => item.category).filter(Boolean))].map((category) => ({
			id: category,
			label: category
		}))
	);

	function formatPrice(value) {
		if (!value) return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

	async function handleDelete(id, type, e) {
		e.stopPropagation();
		openMenu = null;

		if (confirm('Tem certeza que deseja excluir este anúncio?')) {
			const table = type === 'maquinario' ? 'agricultural_machinery' : 'products';

			const { error } = await supabase.from(table).delete().eq('id', id);

			if (!error) {
				// Remove visualmente da lista correta
				if (type === 'maquinario') {
					maquinarios = maquinarios.filter(m => m.id !== id);
				} else {
					produtos = produtos.filter(p => p.id !== id);
				}
			} else {
				alert('Erro ao excluir: ' + error.message);
			}
		}
	}

	function toggleMenu(id, e) {
		e.stopPropagation();
		openMenu = openMenu === id ? null : id;
	}
</script>

<svelte:window onclick={() => openMenu = null} />

<div class="min-h-screen bg-gray-50 pb-20">
	<Header />

	<main class="px-4 py-4 max-w-3xl mx-auto w-full">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Meu Painel</h1>
			<a href="/anunciar" class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 shadow-sm">
				<Plus class="h-4 w-4" />
				Novo Anúncio
			</a>
		</div>

		<!-- Novas Abas: Maquinários vs Produtos -->
		<div class="mb-6 flex gap-2">
			<button
				onclick={() => activeTab = 'maquinarios'}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all {activeTab === 'maquinarios' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:border-green-300'}"
			>
				<Tractor class="h-5 w-5" />
				Maquinários ({maquinarios.length})
			</button>
			<button
				onclick={() => activeTab = 'produtos'}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all {activeTab === 'produtos' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:border-green-300'}"
			>
				<Leaf class="h-5 w-5" />
				Produtos ({produtos.length})
			</button>
		</div>

		<SearchBar
			bind:searchQuery
			bind:filters
			mode={activeTab}
			placeholder={activeTab === 'maquinarios' ? 'Buscar maquinários...' : 'Buscar produtos...'}
			options={{
				brands: brandFilterOptions,
				types: typeFilterOptions,
				categories: categoryFilterOptions
			}}
		/>

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
			</div>
		{:else}

			<!-- LISTA DE MAQUINÁRIOS -->
			{#if activeTab === 'maquinarios'}
				<div class="space-y-3">
					{#each filteredMaquinarios as maq (maq.id)}
						<div class="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
							<div class="flex gap-4 p-4">
								<div class="h-20 w-20 shrink-0 rounded-lg bg-green-50 flex items-center justify-center">
									<Tractor class="h-10 w-10 text-green-600 opacity-80" />
								</div>
								<div class="flex flex-1 flex-col justify-center">
									<h3 class="font-bold text-gray-900 line-clamp-1">{maq.name}</h3>
									<p class="mt-0.5 text-sm font-medium text-green-700">{formatPrice(maq.hourly_rate)} <span class="text-xs font-normal text-gray-500">/hora</span></p>
									<div class="flex gap-2 mt-2">
										<span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{maq.machinery_types?.name || 'Máquina'}</span>
										<span class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {maq.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">{maq.status}</span>
									</div>
								</div>
								<div class="relative">
									<button onclick={(e) => toggleMenu(maq.id, e)} class="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><MoreVertical class="h-5 w-5" /></button>
									{#if openMenu === maq.id}
										<div class="absolute right-0 top-full z-10 mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100">
											<button onclick={(e) => handleDelete(maq.id, 'maquinario', e)} class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"><Trash2 class="h-4 w-4"/> Excluir</button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-12 text-gray-500">Nenhum maquinário encontrado.</div>
					{/each}
				</div>
			{/if}

			<!-- LISTA DE PRODUTOS/INSUMOS -->
			{#if activeTab === 'produtos'}
				<div class="space-y-3">
					{#each filteredProdutos as prod (prod.id)}
						<div class="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
							<div class="flex gap-4 p-4">
								<div class="h-20 w-20 shrink-0 rounded-lg bg-amber-50 flex items-center justify-center">
									<Leaf class="h-10 w-10 text-amber-600 opacity-80" />
								</div>
								<div class="flex flex-1 flex-col justify-center">
									<h3 class="font-bold text-gray-900 line-clamp-1">{prod.name}</h3>
									<p class="mt-0.5 text-sm font-extrabold text-amber-700">{formatPrice(prod.price)}</p>
									<div class="flex gap-2 mt-2">
										<span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{prod.category}</span>
										<span class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase {prod.status === 'Ativo' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}">{prod.status}</span>
									</div>
								</div>
								<div class="relative">
									<button onclick={(e) => toggleMenu(prod.id, e)} class="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><MoreVertical class="h-5 w-5" /></button>
									{#if openMenu === prod.id}
										<div class="absolute right-0 top-full z-10 mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100">
											<button onclick={(e) => handleDelete(prod.id, 'produto', e)} class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"><Trash2 class="h-4 w-4"/> Excluir</button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-12 text-gray-500">Nenhum produto/insumo encontrado.</div>
					{/each}
				</div>
			{/if}

		{/if}
	</main>

	<BottomNav active="inventario" />
</div>
