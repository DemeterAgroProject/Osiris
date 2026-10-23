<script>
	import { resolve } from '$app/paths';
	import { ChevronRight, Mail } from 'lucide-svelte';
	import HelpHeader from '$lib/components/HelpHeader.svelte';
	import HelpNav from '$lib/components/HelpNav.svelte';
	import { HELP_SECTIONS, helpArticlesIn } from '$lib/help';
	import { LEGAL } from '$lib/legal';
</script>

<svelte:head>
	<title>Central de ajuda — Osiris</title>
	<meta name="description" content="Passo a passo para buscar, anunciar, negociar e acompanhar operações no Osiris." />
</svelte:head>

<div class="min-h-screen pb-10">
	<HelpHeader />

	<main class="mx-auto w-full max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
		<aside class="sticky top-24 hidden max-h-[calc(100dvh-7rem)] self-start overflow-y-auto pr-2 lg:block">
			<HelpNav />
		</aside>

		<div class="min-w-0 max-w-4xl">
			<h1 class="preset-typo-headline">Central de ajuda</h1>
			<p class="mt-1 preset-typo-subtitle">
				Passo a passo para usar o Osiris. Use a busca acima ou escolha um tema abaixo.
			</p>

			<div class="mt-6 space-y-7">
				{#each HELP_SECTIONS as section (section.id)}
					<section aria-labelledby="ajuda-{section.id}">
						<h2 id="ajuda-{section.id}" class="flex items-center gap-2 preset-typo-title">
							<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-container preset-tonal-primary">
								<section.icon class="h-5 w-5" />
							</span>
							{section.title}
						</h2>
						<ul class="mt-3 grid gap-3 sm:grid-cols-2">
							{#each helpArticlesIn(section.id) as article (article.slug)}
								<li>
									<a
										href={resolve(`/ajuda/${article.slug}`)}
										class="flex h-full items-center gap-3 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500"
									>
										<span class="min-w-0 flex-1">
											<span class="block preset-typo-card-title">{article.title}</span>
											<span class="mt-1 block text-sm text-surface-800-200">{article.summary}</span>
										</span>
										<ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300" />
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>

			<section class="mt-8 flex flex-col gap-3 rounded-container preset-tonal-primary p-5 sm:flex-row sm:items-center">
				<div class="flex-1">
					<h2 class="preset-typo-card-title">Não achou o que procurava?</h2>
					<p class="mt-1 text-sm">Escreva para a equipe do Osiris. Respondemos por e-mail.</p>
				</div>
				<a href="mailto:{LEGAL.contato}" class="btn btn-md preset-filled-primary-500">
					<Mail size={18} />
					<span>Falar com a equipe</span>
				</a>
			</section>
		</div>
	</main>
</div>
