<script>
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import NegotiationPropose from '$lib/components/NegotiationPropose.svelte';
	import { ChevronLeft, Star } from 'lucide-svelte';

	let loading = $state(true);
	let errorMessage = $state('');
	let item = $state(null);
	let seller = $state({
		name: 'Anunciante',
		avatarUrl: null
	});
	let showNegotiationModal = $state(false);

	const routeTipo = $derived(page.params.tipo);
	const routeId = $derived(page.params.id);

	function formatCurrency(value) {
		if (value === null || value === undefined || value === '') return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
	}

	function resolveSellerName(profile) {
		return (
			profile?.full_name ||
			profile?.display_name ||
			profile?.name ||
			profile?.username ||
			profile?.email ||
			'Anunciante'
		);
	}

	function resolveSellerAvatar(profile) {
		return (
			profile?.avatar_url ||
			profile?.photo_url ||
			profile?.image_url ||
			profile?.profile_image_url ||
			null
		);
	}

	async function loadSeller(ownerId) {
		seller = { name: 'Anunciante', avatarUrl: null };
		if (!ownerId) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', ownerId)
			.maybeSingle();

		if (!error && data) {
			seller = {
				name: resolveSellerName(data),
				avatarUrl: resolveSellerAvatar(data)
			};
		}
	}

	async function loadItemDetails() {
		loading = true;
		errorMessage = '';
		item = null;
		seller = { name: 'Anunciante', avatarUrl: null };

		if (!routeTipo || !routeId) {
			errorMessage = 'Anúncio inválido.';
			loading = false;
			return;
		}

		if (routeTipo === 'produto') {
			const { data, error } = await supabase
				.from('products')
				.select('id, name, price, category, quantity, stock_unit, status, owner_id, created_at')
				.eq('id', routeId)
				.maybeSingle();

			if (error || !data) {
				errorMessage = 'Produto não encontrado.';
				loading = false;
				return;
			}

			item = {
				type: 'produto',
				title: data.name,
				priceLabel: formatCurrency(data.price),
				description: 'Anúncio público de produto no marketplace Osiris.',
				details: [
					{ label: 'Categoria', value: data.category || 'Não informado' },
					{ label: 'Quantidade', value: data.quantity ?? 'Não informado' },
					{ label: 'Unidade', value: data.stock_unit || 'Não informado' },
					{ label: 'Status', value: data.status || 'Não informado' }
				]
			};

			await loadSeller(data.owner_id);
		} else if (routeTipo === 'maquinario') {
			const { data, error } = await supabase
				.from('agricultural_machinery')
				.select('id, name, hourly_rate, model, manufacture_year, current_horimeter, status, owner_id, machinery_types(name), brands(name)')
				.eq('id', routeId)
				.maybeSingle();

			if (error || !data) {
				errorMessage = 'Maquinário não encontrado.';
				loading = false;
				return;
			}

			item = {
				type: 'maquinario',
				title: data.name,
				priceLabel: `${formatCurrency(data.hourly_rate)} / hora`,
				description: 'Anúncio público de maquinário agrícola no marketplace Osiris.',
				details: [
					{ label: 'Tipo', value: data.machinery_types?.name || 'Não informado' },
					{ label: 'Marca', value: data.brands?.name || 'Não informado' },
					{ label: 'Modelo', value: data.model || 'Não informado' },
					{ label: 'Ano', value: data.manufacture_year || 'Não informado' },
					{ label: 'Horímetro', value: data.current_horimeter || 'Não informado' },
					{ label: 'Status', value: data.status || 'Não informado' }
				]
			};

			await loadSeller(data.owner_id);
		} else {
			errorMessage = 'Tipo de anúncio não suportado.';
		}

		loading = false;
	}

	$effect(() => {
		void routeTipo;
		void routeId;
		loadItemDetails();
	});
</script>

<div class="min-h-screen bg-gray-100 pb-24">
	<Header />

	<main class="mx-auto w-full max-w-3xl">
		<a
			href="/buscar"
			class="mx-4 mt-4 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600"
		>
			<ChevronLeft class="h-4 w-4" />
			Voltar
		</a>

		{#if loading}
			<div class="px-4 py-10 text-center text-sm text-gray-500">Carregando anúncio...</div>
		{:else if errorMessage}
			<div class="mx-4 mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
		{:else if item}
			<section class="mt-4 rounded-t-3xl bg-white p-4 shadow-sm">
				<div class="aspect-[16/10] rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50"></div>

				<div class="mt-4">
					<p class="text-3xl font-extrabold text-green-700">{item.priceLabel}</p>
					<h1 class="mt-2 text-3xl font-bold text-gray-900">{item.title}</h1>
					<p class="mt-3 text-base leading-7 text-gray-600">{item.description}</p>
				</div>

				<div class="mt-6 overflow-hidden rounded-2xl border border-gray-200">
					<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
						<h2 class="text-2xl font-semibold text-gray-900">Detalhes</h2>
					</div>
					<div class="divide-y divide-gray-200 px-4">
						{#each item.details as detail}
							<div class="grid grid-cols-2 gap-3 py-3 text-sm">
								<p class="font-semibold text-gray-500">{detail.label}</p>
								<p class="font-medium text-gray-800">{detail.value}</p>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-8 flex items-center gap-3">
					{#if seller.avatarUrl}
						<img src={seller.avatarUrl} alt={seller.name} class="h-14 w-14 rounded-full object-cover" />
					{:else}
						<div class="h-14 w-14 rounded-full bg-green-100"></div>
					{/if}
					<div>
						<p class="text-sm font-semibold text-green-700">Anunciante</p>
						<p class="text-3xl font-semibold text-gray-900">{seller.name}</p>
						<p class="text-sm font-semibold text-gray-700">4.9 <Star class="inline h-4 w-4 fill-current" /></p>
					</div>
				</div>

				<button
					onclick={() => (showNegotiationModal = true)}
					class="mt-6 w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-800"
				>
					Negociar
				</button>
			</section>
		{/if}
	</main>

	<NegotiationPropose
		bind:open={showNegotiationModal}
		title={item?.title || 'Anúncio'}
		priceLabel={item?.priceLabel || 'Preço a combinar'}
		sellerName={seller.name}
		type={item?.type || 'produto'}
	/>

	<BottomNav />
</div>
