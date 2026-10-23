<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ChevronLeft, ChevronRight, ArrowRight, Lightbulb, Mail } from 'lucide-svelte';
	import HelpHeader from '$lib/components/HelpHeader.svelte';
	import HelpNav from '$lib/components/HelpNav.svelte';
	import { HELP_ARTICLES, findHelpArticle, findHelpSection } from '$lib/help';
	import { LEGAL } from '$lib/legal';

	const article = $derived(findHelpArticle(page.params.slug));
	const sectionTitle = $derived(article ? (findHelpSection(article.section)?.title ?? '') : '');
	const index = $derived(HELP_ARTICLES.findIndex((item) => item.slug === article?.slug));
	const previous = $derived(index > 0 ? HELP_ARTICLES[index - 1] : null);
	const next = $derived(index >= 0 && index < HELP_ARTICLES.length - 1 ? HELP_ARTICLES[index + 1] : null);
</script>

<svelte:head>
	<title>{article ? `${article.title} — Ajuda` : 'Ajuda'} — Osiris</title>
	{#if article}
		<meta name="description" content={article.summary} />
	{/if}
</svelte:head>

<div class="min-h-screen pb-10">
	<HelpHeader current={article?.slug} />

	<main class="mx-auto w-full max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
		<aside class="sticky top-24 hidden max-h-[calc(100dvh-7rem)] self-start overflow-y-auto pr-2 lg:block">
			<HelpNav current={article?.slug} />
		</aside>

		<div class="min-w-0 max-w-3xl">
			{#if !article}
				<div class="rounded-container border border-surface-200-800 bg-surface-50-950 p-6 text-center shadow-sm">
					<h1 class="preset-typo-title">Artigo não encontrado</h1>
					<p class="mt-1 text-sm text-surface-800-200">Esse tema de ajuda não existe ou mudou de endereço.</p>
					<a href={resolve('/ajuda')} class="btn btn-lg preset-filled-primary-500 mt-4">Ver todos os temas</a>
				</div>
			{:else}
				<nav class="mb-3 flex items-center gap-1.5 text-sm" aria-label="Caminho">
					<a href={resolve('/ajuda')} class="text-surface-800-200 hover:text-primary-700-300">Ajuda</a>
					<span class="text-surface-700-300">/</span>
					<span class="truncate font-semibold text-surface-950-50" aria-current="page">{article.title}</span>
				</nav>

				<article>
					<p class="preset-typo-label text-primary-700-300">{sectionTitle}</p>
					<h1 class="mt-1 preset-typo-headline">{article.title}</h1>
					<p class="mt-2 preset-typo-subtitle">{article.objetivo}</p>

					<section class="mt-6" aria-labelledby="ajuda-onde">
						<h2 id="ajuda-onde" class="preset-typo-title">Onde fica</h2>
						<ul class="mt-3 divide-y divide-surface-200-800 overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm">
							{#each article.onde as place (place.label)}
								<li class="flex items-center gap-3 px-4 py-3">
									<p class="min-w-0 flex-1 text-sm text-surface-800-200">
										<span class="font-semibold text-surface-950-50">{place.label}:</span>
										{place.text}
									</p>
									{#if place.href}
										<a href={resolve(place.href)} class="btn btn-sm preset-tonal-primary shrink-0">
											<span>Abrir</span>
											<ArrowRight size={16} />
										</a>
									{/if}
								</li>
							{/each}
						</ul>
					</section>

					<section class="mt-6" aria-labelledby="ajuda-passos">
						<h2 id="ajuda-passos" class="preset-typo-title">Passo a passo</h2>
						<ol class="mt-3 space-y-3">
							{#each article.passos as step, stepIndex (stepIndex)}
								<li class="flex gap-3">
									<span
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full preset-filled-primary-500 text-sm font-bold"
										aria-hidden="true"
									>
										{stepIndex + 1}
									</span>
									<p class="pt-1 text-base text-surface-900-100">{step}</p>
								</li>
							{/each}
						</ol>
					</section>

					{#if article.notas.length}
						<section class="mt-6 rounded-container preset-tonal-warning p-4" aria-labelledby="ajuda-notas">
							<h2 id="ajuda-notas" class="flex items-center gap-2 font-bold">
								<Lightbulb size={18} />
								Bom saber
							</h2>
							<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
								{#each article.notas as note (note)}
									<li>{note}</li>
								{/each}
							</ul>
						</section>
					{/if}
				</article>

				<nav class="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Outros temas">
					{#if previous}
						<a
							href={resolve(`/ajuda/${previous.slug}`)}
							class="flex items-center gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 shadow-sm transition-colors hover:border-primary-500"
						>
							<ChevronLeft class="h-5 w-5 shrink-0 text-surface-700-300" />
							<span class="min-w-0 flex-1">
								<span class="block preset-typo-caption">Anterior</span>
								<span class="block truncate font-semibold">{previous.title}</span>
							</span>
						</a>
					{:else}
						<span class="hidden sm:block"></span>
					{/if}
					{#if next}
						<a
							href={resolve(`/ajuda/${next.slug}`)}
							class="flex items-center justify-end gap-2 rounded-container border border-surface-200-800 bg-surface-50-950 p-4 text-right shadow-sm transition-colors hover:border-primary-500"
						>
							<span class="min-w-0 flex-1">
								<span class="block preset-typo-caption">Próximo</span>
								<span class="block truncate font-semibold">{next.title}</span>
							</span>
							<ChevronRight class="h-5 w-5 shrink-0 text-surface-700-300" />
						</a>
					{/if}
				</nav>

				<p class="mt-6 flex flex-wrap items-center gap-1.5 text-sm text-surface-800-200">
					<Mail size={16} />
					Ainda com dúvida? Escreva para
					<a href="mailto:{LEGAL.contato}" class="font-semibold text-primary-700-300 underline">{LEGAL.contato}</a>
				</p>
			{/if}
		</div>
	</main>
</div>
