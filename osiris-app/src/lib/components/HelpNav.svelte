<script>
	import { resolve } from '$app/paths';
	import { HELP_SECTIONS, helpArticlesIn } from '$lib/help';

	// lista de temas da ajuda: coluna lateral no computador e gaveta do menu no celular
	let { current = '', onnavigate = undefined } = $props();
</script>

<nav aria-label="Temas da ajuda">
	{#each HELP_SECTIONS as section (section.id)}
		<p class="mb-1.5 mt-5 px-3 preset-typo-label first:mt-0">{section.title}</p>
		<ul class="space-y-0.5">
			{#each helpArticlesIn(section.id) as article (article.slug)}
				{@const active = article.slug === current}
				<li>
					<a
						href={resolve(`/ajuda/${article.slug}`)}
						onclick={onnavigate}
						aria-current={active ? 'page' : undefined}
						class="block rounded-container px-3 py-2 text-sm transition-colors {active
							? 'preset-tonal-primary font-semibold'
							: 'text-surface-900-100 hover:preset-tonal'}"
					>
						{article.title}
					</a>
				</li>
			{/each}
		</ul>
	{/each}
</nav>
