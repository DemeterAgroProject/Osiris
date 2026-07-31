<script>
	import { goto } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Cog, Leaf } from 'lucide-svelte';
	import { Carousel } from '@skeletonlabs/skeleton-svelte';
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

	function enterOnboarding() {
		showSplash = false;
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
		class="relative flex min-h-screen w-full flex-col overflow-hidden bg-surface-50-950 text-left"
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
	<Carousel
		slideCount={totalSlides}
		page={currentSlide}
		onPageChange={(details) => (currentSlide = details.page)}
		allowMouseDrag
		class="flex min-h-screen flex-col bg-surface-50-950"
	>
		<header class="flex shrink-0 items-center justify-between px-6 pb-2 pt-12">
			<span class="text-sm font-medium text-surface-700-300" aria-live="polite">{stepLabel}</span>
			<button
				type="button"
				onclick={skip}
				class="text-sm font-medium transition-colors hover:text-primary-700"
			>
				Pular
			</button>
		</header>

		<Carousel.ItemGroup class="flex min-h-0 flex-1">
			{#each slides as slide, index (slide.title)}
				<Carousel.Item {index} class="flex min-w-0 flex-[0_0_100%] flex-col">
					<OnboardingSlide
						imageSrc={slide.imageSrc}
						title={slide.title}
						description={slide.description}
					/>
				</Carousel.Item>
			{/each}
		</Carousel.ItemGroup>

		<footer class="shrink-0 px-6 pb-10 pt-2">
			<Carousel.IndicatorGroup class="mb-6 flex justify-center gap-2" aria-label="Progresso do onboarding">
				{#each slides as _, index (index)}
					<Carousel.Indicator
						{index}
						aria-label="Slide {index + 1} de {totalSlides}"
						class="h-2 w-2 rounded-full bg-surface-400-600 transition-all duration-300 data-[current]:w-8 data-[current]:bg-surface-950-50"
					/>
				{/each}
			</Carousel.IndicatorGroup>

			<Carousel.Control class="flex items-center justify-between">
				{#if currentSlide > 0}
					<Carousel.PrevTrigger
						class="rounded-full p-2 text-surface-700-300 transition-colors hover:preset-tonal hover:text-surface-700-300"
						aria-label="Slide anterior"
					>
						<ChevronLeft class="h-7 w-7" strokeWidth={2} />
					</Carousel.PrevTrigger>
				{:else}
					<div class="w-11" aria-hidden="true"></div>
				{/if}

				{#if isLastSlide}
					<button
						type="button"
						onclick={finish}
						class="text-base font-bold text-primary-600 transition-colors hover:text-primary-700"
					>
						Começar
					</button>
				{:else}
					<Carousel.NextTrigger
						class="rounded-full p-2 text-primary-600 transition-colors hover:preset-tonal-primary hover:text-primary-700"
						aria-label="Próximo slide"
					>
						<ChevronRight class="h-7 w-7" strokeWidth={2} />
					</Carousel.NextTrigger>
				{/if}
			</Carousel.Control>
		</footer>
	</Carousel>
{/if}
