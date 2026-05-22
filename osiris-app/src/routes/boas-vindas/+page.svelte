<script>
	import { goto } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Cog, Leaf } from 'lucide-svelte';
	import OnboardingSlide from '$lib/components/OnboardingSlide.svelte';
	import carIllustration from '$lib/images/car.png';
	import chatIllustration from '$lib/images/chat.png';
	import accountIllustration from '$lib/images/acount.png';

	let showSplash = $state(true);
	let currentSlide = $state(0);

	const slides = [
		{
			imageSrc: carIllustration,
			title: 'Encontre produtos ou serviços',
			description:
				'Pesquise e filtre tudo que você precisa: compra, aluguel ou serviço, diretamente no seu celular.'
		},
		{
			imageSrc: chatIllustration,
			title: 'Negocie e converse com o anunciante',
			description:
				'Faça sua proposta de valor, ajuste quantidades e envie mensagens em tempo real pelo chat integrado.'
		},
		{
			imageSrc: accountIllustration,
			title: 'Gerencie seus anúncios e perfil',
			description:
				'Cadastre produtos e serviços, acompanhe solicitações, edite seu estoque e receba notificações de novas negociações.'
		}
	];

	const totalSlides = slides.length;
	const stepLabel = $derived(`${currentSlide + 1}/${totalSlides}`);
	const isLastSlide = $derived(currentSlide === totalSlides - 1);
	const activeSlide = $derived(slides[currentSlide]);

	function enterOnboarding() {
		showSplash = false;
	}

	function nextSlide() {
		if (currentSlide < totalSlides - 1) {
			currentSlide += 1;
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide -= 1;
		}
	}

	function goToSlide(index) {
		if (index >= 0 && index < totalSlides) {
			currentSlide = index;
		}
	}

	function skip() {
		goto('/login');
	}

	function finish() {
		goto('/login');
	}
</script>

<svelte:head>
	<title>Bem-vindo — Osiris</title>
	<meta
		name="description"
		content="Conheça o marketplace agro Osiris: busque ofertas, negocie e gerencie seus anúncios."
	/>
</svelte:head>

{#if showSplash}
	<button
		type="button"
		class="relative flex min-h-screen w-full flex-col overflow-hidden bg-white text-left"
		onclick={enterOnboarding}
		aria-label="Continuar para apresentação do app"
	>
		<div class="flex flex-1 flex-col items-center justify-center px-8">
			<div class="flex items-center gap-3">
				<img src="/logo_black.png" alt="Osiris" class="h-24 w-auto" />
                
                <span class="text-6xl font-bold">
                    Osiris
                </span>
			</div>
		</div>
	</button>
{:else}
	<div class="flex min-h-screen flex-col bg-white">
		<header class="flex shrink-0 items-center justify-between px-6 pb-2 pt-12">
			<span class="text-sm font-medium text-gray-400" aria-live="polite">{stepLabel}</span>
			<button
				type="button"
				onclick={skip}
				class="text-sm font-medium text-gray-800 transition-colors hover:text-green-700"
			>
				Pular
			</button>
		</header>

		<div class="flex min-h-0 flex-1 flex-col">
			{#key currentSlide}
				<OnboardingSlide
					imageSrc={activeSlide.imageSrc}
					title={activeSlide.title}
					description={activeSlide.description}
				/>
			{/key}
		</div>

		<footer class="shrink-0 px-6 pb-10 pt-2">
			<div class="mb-6 flex justify-center gap-2" role="tablist" aria-label="Progresso do onboarding">
				{#each slides as _, index (index)}
					<button
						type="button"
						role="tab"
						aria-selected={index === currentSlide}
						aria-label="Slide {index + 1} de {totalSlides}"
						onclick={() => goToSlide(index)}
						class="rounded-full transition-all duration-300 {index === currentSlide
							? 'h-2 w-8 bg-gray-900'
							: 'h-2 w-2 bg-gray-300 hover:bg-gray-400'}"
					></button>
				{/each}
			</div>

			<div class="flex items-center justify-between">
				{#if currentSlide > 0}
					<button
						type="button"
						onclick={prevSlide}
						class="rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500"
						aria-label="Slide anterior"
					>
						<ChevronLeft class="h-7 w-7" strokeWidth={2} />
					</button>
				{:else}
					<div class="w-11" aria-hidden="true"></div>
				{/if}

				{#if isLastSlide}
					<button
						type="button"
						onclick={finish}
						class="text-base font-bold text-green-600 transition-colors hover:text-green-700"
					>
						Começar
					</button>
				{:else}
					<button
						type="button"
						onclick={nextSlide}
						class="rounded-full p-2 text-green-600 transition-colors hover:bg-green-50 hover:text-green-700"
						aria-label="Próximo slide"
					>
						<ChevronRight class="h-7 w-7" strokeWidth={2} />
					</button>
				{/if}
			</div>
		</footer>
	</div>
{/if}
