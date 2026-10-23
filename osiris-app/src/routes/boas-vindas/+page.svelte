<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { markOnboardingSeen, safeRedirectPath } from '$lib/onboarding';
	import { track } from '$lib/telemetry';
	import { Carousel } from '@skeletonlabs/skeleton-svelte';
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';
	import OnboardingSlide from '$lib/components/OnboardingSlide.svelte';
	import carIllustration from '$lib/images/car.png';
	import chatIllustration from '$lib/images/chat.png';
	import accountIllustration from '$lib/images/acount.png';
	import { m } from '$lib/paraglide/messages';

	let showSplash = $state(true);
	let currentSlide = $state(0);

	const slides = [
		{
			id: 'buscar',
			imageSrc: carIllustration,
			title: m.app_bv_slide1_titulo(),
			description: m.app_bv_slide1_desc()
		},
		{
			id: 'negociar',
			imageSrc: chatIllustration,
			title: m.app_bv_slide2_titulo(),
			description: m.app_bv_slide2_desc()
		},
		{
			id: 'gerenciar',
			imageSrc: accountIllustration,
			title: m.app_bv_slide3_titulo(),
			description: m.app_bv_slide3_desc()
		}
	];

	const totalSlides = slides.length;
	const stepLabel = $derived(`${currentSlide + 1}/${totalSlides}`);
	const isLastSlide = $derived(currentSlide === totalSlides - 1);

	function enterOnboarding() {
		showSplash = false;
	}

	// volta para onde a pessoa estava (ou a página inicial) e não mostra de novo neste aparelho
	function finish() {
		track('apresentacao_concluida', { ultimo_slide: currentSlide + 1, pulou: !isLastSlide });
		markOnboardingSeen();
		const target = safeRedirectPath(page.url.searchParams.get('redirect')) || '/';
		goto(resolve(target), { replaceState: true });
	}

	onMount(() => {
		const timer = setTimeout(enterOnboarding, 1500);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{m.app_bv_titulo()} — Osiris</title>
	<meta name="description" content={m.app_bv_meta_desc()} />
</svelte:head>

{#if showSplash}
	<button
		type="button"
		class="relative flex min-h-screen w-full flex-col overflow-hidden bg-surface-50-950 text-left"
		onclick={enterOnboarding}
		aria-label={m.app_bv_continuar_aria()}
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
	<div class="flex min-h-screen flex-col bg-surface-50-950">
		<header class="flex shrink-0 items-center justify-between px-6 pb-2 pt-12">
			<span class="text-sm font-medium text-surface-800-200" aria-live="polite">{stepLabel}</span>
			<button
				type="button"
				onclick={finish}
				class="btn preset-tonal"
			>
				<span>{m.app_bv_pular()}</span>
			</button>
		</header>

		<!-- arrastar com o dedo (ou o mouse) troca de slide; setas e pontos também -->
		<Carousel
			slideCount={totalSlides}
			page={currentSlide}
			onPageChange={(details) => (currentSlide = details.page)}
			allowMouseDrag
			class="flex min-h-0 flex-1 flex-col"
		>
			<Carousel.ItemGroup class="flex min-h-0 flex-1">
				{#each slides as slide, index (slide.id)}
					<Carousel.Item {index} class="flex min-h-0 flex-col">
						<OnboardingSlide
							imageSrc={slide.imageSrc}
							title={slide.title}
							description={slide.description}
						/>
					</Carousel.Item>
				{/each}
			</Carousel.ItemGroup>

			<footer class="shrink-0 px-6 pb-10 pt-2">
				<Carousel.IndicatorGroup class="mb-6 flex justify-center gap-2" aria-label={m.app_bv_progresso()}>
					{#each slides as slide, index (slide.id)}
						<Carousel.Indicator
							{index}
							aria-label={m.app_bv_slide_n({ n: index + 1, total: totalSlides })}
							class="h-2 w-2 rounded-full bg-surface-400-600 transition-all duration-300 hover:preset-tonal data-[current]:w-8 data-[current]:bg-primary-500"
						/>
					{/each}
				</Carousel.IndicatorGroup>

				<div class="flex items-center justify-between">
					{#if currentSlide > 0}
						<Carousel.PrevTrigger
							class="btn-icon btn-icon-lg preset-tonal"
							title={m.app_bv_slide_anterior()}
							aria-label={m.app_bv_slide_anterior()}
						>
							<ArrowLeft size={18} />
						</Carousel.PrevTrigger>
					{:else}
						<div class="w-11" aria-hidden="true"></div>
					{/if}

					{#if isLastSlide}
						<button
							type="button"
							onclick={finish}
							class="btn btn-lg preset-filled-primary-500"
						>
							<span>{m.app_bv_comecar()}</span>
							<ArrowRight size={18} />
						</button>
					{:else}
						<Carousel.NextTrigger
							class="btn-icon btn-icon-lg preset-filled-primary-500"
							title={m.app_bv_proximo_slide()}
							aria-label={m.app_bv_proximo_slide()}
						>
							<ArrowRight size={18} />
						</Carousel.NextTrigger>
					{/if}
				</div>
			</footer>
		</Carousel>
	</div>
{/if}
