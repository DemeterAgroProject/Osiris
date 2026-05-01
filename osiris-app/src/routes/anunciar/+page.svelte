<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { ChevronRight, ChevronLeft, Tractor, MapPin } from 'lucide-svelte';
	// Se você não tiver os componentes Header e BottomNav, pode remover essas linhas:
	import Header from '$lib/components/Header.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	// Step management
	let currentStep = $state(0);
	const totalSteps = 4;
	let loading = $state(false);
	let message = $state({ text: '', type: '' });

	// Dados carregados do Banco
	let brands = $state([]);
	let types = $state([]);

	// Form state unificado
	let form = $state({
            category: '', 
            name: '',
            price: null,
            location: 'Alegrete, RS',
            
            // Campos específicos de Maquinário
            brand_id: '',
            type_id: '',
            model: '',
            manufacture_year: '',
            current_horimeter: '',

            // Campos específicos de Produto/Insumo
            quantity: 1,
            stock_unit: 'Sacas'
	});

	onMount(async () => {
		// Carrega as marcas e tipos logo que a página abre
		const [{ data: bData }, { data: tData }] = await Promise.all([
			supabase.from('brands').select('*').order('name'),
			supabase.from('machinery_types').select('*').order('name')
		]);
		if (bData) brands = bData;
		if (tData) types = tData;
	});

	// Validação de cada etapa para liberar o botão "Próximo"
	function canProceed() {
		if (currentStep === 0) return form.category !== '';
		
		if (currentStep === 1) { 
			if (form.category === 'maquinario') {
				return form.name.trim().length > 0 && form.brand_id !== '' && form.type_id !== '' && form.model.trim().length > 0 && form.manufacture_year > 0 && form.current_horimeter !== '';
			}
			// Se for produto, exige nome e quantidade
			return form.name.trim().length > 0 && form.quantity > 0;
		}
		
		if (currentStep === 2) return true;
		if (currentStep === 3) return form.price !== null && form.price > 0; 
		
		return true;
	}

	function nextStep() {
		if (currentStep < totalSteps - 1 && canProceed()) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		} else {
			goto('/inventario');
		}
	}

	function formatPrice(value) {
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

    async function handleSubmit() {
		loading = true;
		message = { text: '', type: '' };

		const { data: { user } } = await supabase.auth.getUser();

		if (!user) {
			message = { text: 'Você precisa estar logado para anunciar.', type: 'error' };
			loading = false;
			return;
		}

		if (form.category === 'maquinario') {
			// Salva Maquinário
			const { error } = await supabase.from('agricultural_machinery').insert({
				owner_id: user.id,
				name: form.name,
				brand_id: form.brand_id,
				type_id: form.type_id,
				model: form.model,
				manufacture_year: parseInt(form.manufacture_year),
				current_horimeter: parseFloat(form.current_horimeter),
				hourly_rate: form.price 
			});

			if (error) throw error;
		} else if (form.category === 'produto') {
			const { error } = await supabase.from('products').insert({
				owner_id: user.id,
				name: form.name,
				price: form.price,
				category: 'Insumo', 
				quantity: form.quantity,        // Agora pega o que o produtor digitou
				stock_unit: form.stock_unit     // Agora pega a medida (Kg, Sacas, etc)
			});
			if (error) throw error;
		}

		message = { text: 'Anúncio publicado com sucesso no Osíris!', type: 'success' };
		setTimeout(() => goto('/inventario'), 2000);
		
		loading = false;
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50 pb-20">
	<!-- Comente ou remova as linhas abaixo se não tiver os componentes Header/BottomNav -->
	<Header /> 

	<main class="flex flex-1 flex-col px-4 py-4 max-w-2xl mx-auto w-full">
		<h1 class="mb-6 text-center text-xl font-bold text-gray-900">Novo Anúncio</h1>

		{#if message.text}
			<div class="p-4 mb-4 rounded-lg {message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
				{message.text}
			</div>
		{/if}

		<!-- ETAPA 0: O que você quer anunciar? -->
		{#if currentStep === 0}
			<div class="flex flex-1 flex-col">
				<p class="mb-2 text-sm text-gray-500">Etapa 1 de 4</p>
				<h2 class="mb-4 text-base text-gray-600">O que você deseja anunciar?</h2>

				<div class="space-y-3">
					<button
						onclick={() => form.category = 'maquinario'}
						class="flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all {form.category === 'maquinario' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}"
					>
						<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700">
							<Tractor class="h-6 w-6" />
						</div>
						<div class="flex-1">
							<h3 class="font-medium text-gray-900">Maquinário Agrícola</h3>
							<p class="text-xs text-gray-500">Tratores, colheitadeiras, plantadeiras</p>
						</div>
					</button>

					<button
						onclick={() => form.category = 'produto'}
						class="flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all {form.category === 'produto' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}"
					>
						<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
							<span class="text-xl">🌱</span>
						</div>
						<div class="flex-1">
							<h3 class="font-medium text-gray-900">Insumos ou Produtos</h3>
							<p class="text-xs text-gray-500">Sementes, mudas para reflorestamento</p>
						</div>
					</button>
				</div>
			</div>

		<!-- ETAPA 1: Detalhes da Máquina -->
		{:else if currentStep === 1}
			<div class="flex flex-1 flex-col">
				<p class="mb-2 text-sm text-gray-500">Etapa 2 de 4</p>
				<h2 class="mb-4 text-lg font-semibold text-gray-900">
					Detalhes do {form.category === 'maquinario' ? 'Maquinário' : 'Produto'}
				</h2>

				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Título do Anúncio</label>
						<input 
							type="text" 
							id="name" 
							bind:value={form.name} 
							placeholder={form.category === 'maquinario' ? "Ex: Trator JD 6100J" : "Ex: Sementes de Soja Branca"} 
							class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20" 
						/>
					</div>

					{#if form.category === 'maquinario'}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="type">Tipo</label>
								<select id="type" bind:value={form.type_id} class="w-full rounded-lg border border-gray-300 p-3 bg-white text-sm outline-none focus:border-green-500">
									<option value="" disabled>Selecione</option>
									{#each types as type}
										<option value={type.id}>{type.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="brand">Marca</label>
								<select id="brand" bind:value={form.brand_id} class="w-full rounded-lg border border-gray-300 p-3 bg-white text-sm outline-none focus:border-green-500">
									<option value="" disabled>Selecione</option>
									{#each brands as brand}
										<option value={brand.id}>{brand.name}</option>
									{/each}
								</select>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1" for="model">Modelo Exato</label>
							<input type="text" id="model" bind:value={form.model} placeholder="Ex: 6100J" class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-500" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="year">Ano de Fab.</label>
								<input type="number" id="year" bind:value={form.manufacture_year} placeholder="Ex: 2018" min="1950" class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-500" />
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="horimeter">Horímetro</label>
								<input type="number" id="horimeter" bind:value={form.current_horimeter} placeholder="Em horas" class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-500" />
							</div>
						</div>

					{:else if form.category === 'produto'}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="qty">Quantidade</label>
								<input type="number" id="qty" bind:value={form.quantity} min="1" class="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-500" />
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1" for="unit">Unidade</label>
								<select id="unit" bind:value={form.stock_unit} class="w-full rounded-lg border border-gray-300 p-3 bg-white text-sm outline-none focus:border-green-500">
									<option value="Sacas">Sacas</option>
									<option value="Kg">Kg</option>
									<option value="Toneladas">Toneladas</option>
									<option value="Litros">Litros</option>
									<option value="Unidades">Unidades</option>
								</select>
							</div>
						</div>
					{/if}
				</div>
			</div>

		<!-- ETAPA 2: Localização (Mantive a do seu amigo) -->
		{:else if currentStep === 2}
			<div class="flex flex-1 flex-col">
				<p class="mb-2 text-sm text-gray-500">Etapa 3 de 4</p>
				<h2 class="mb-4 text-base text-gray-600">Localização do Equipamento</h2>
				<div class="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 min-h-[300px]">
					<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
						<svg class="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
							{#each Array(10) as _, i}
								<line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="currentColor" stroke-width="0.5" />
								<line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="currentColor" stroke-width="0.5" />
							{/each}
						</svg>
					</div>
					<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
						<div class="relative">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 shadow-lg">
								<MapPin class="h-5 w-5 text-white" />
							</div>
							<div class="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-red-500"></div>
						</div>
					</div>
					<div class="absolute bottom-4 left-4 right-4">
						<div class="rounded-lg bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm border border-gray-200">
							<p class="text-sm font-medium text-gray-900">{form.location}</p>
							<p class="text-xs text-gray-500">Alegrete e Região</p>
						</div>
					</div>
				</div>
			</div>

		<!-- ETAPA 3: Preço -->
		{:else if currentStep === 3}
			<div class="flex flex-1 flex-col">
				<p class="mb-2 text-sm text-gray-500">Etapa 4 de 4</p>
				<h2 class="mb-6 text-lg font-semibold text-gray-900">Qual é o valor cobrado?</h2>

				<div>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">R$</span>
						<input
							type="number"
							bind:value={form.price}
							placeholder="500"
							class="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
						/>
					</div>
					<p class="mt-2 text-xs text-gray-500">Valor por hora de trabalho (se for aluguel) ou venda.</p>
				</div>

				{#if form.price && form.price > 0}
					<div class="mt-6 rounded-xl bg-green-50 p-4 border border-green-100">
						<p class="text-sm text-gray-600">Seu anúncio será publicado por:</p>
						<p class="mt-1 text-2xl font-bold text-green-700">{formatPrice(form.price)}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Botões de Navegação Inferior -->
		<div class="mt-8 space-y-3">
			{#if currentStep === totalSteps - 1}
				<button
					onclick={handleSubmit}
					disabled={!canProceed() || loading}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
				>
					{loading ? 'Salvando no Banco...' : 'Publicar Anúncio'}
				</button>
				<button onclick={prevStep} disabled={loading} class="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
					Voltar e Revisar
				</button>
			{:else}
				<button
					onclick={nextStep}
					disabled={!canProceed()}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
				>
					Próximo <ChevronRight class="h-5 w-5" />
				</button>
				<button onclick={prevStep} class="w-full rounded-lg border border-gray-300 bg-white py-3.5 font-medium text-gray-700 hover:bg-gray-50">
					{currentStep === 0 ? 'Cancelar' : 'Voltar'}
				</button>
			{/if}
		</div>
	</main>

	<BottomNav active="anunciar" />
</div>