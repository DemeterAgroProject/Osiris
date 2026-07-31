<script>
	import { MapPin, Eye, Clock } from 'lucide-svelte';

	function formatCurrency(value) {
		if (value === null || value === undefined || value === '') return 'Preço a combinar';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
	}

	function formatPublishedDate(value) {
		if (!value) return 'Agora';
		const published = new Date(value);
		if (Number.isNaN(published.getTime())) return 'Agora';

		const diffInHours = Math.floor((Date.now() - published.getTime()) / (1000 * 60 * 60));
		if (diffInHours < 1) return 'Agora';
		if (diffInHours < 24) return `${diffInHours}h atrás`;
		const diffInDays = Math.floor(diffInHours / 24);
		return `${diffInDays}d atrás`;
	}

	let {
		title,
		price,
		location = 'Alegrete, RS',
		views = '-',
		publishedAt,
		imageUrl,
		sponsored = false,
		tipo = '',
		adId = '',
		href = ''
	} = $props();

	const resolvedTitle = $derived(title || 'Anúncio');
	const resolvedPrice = $derived(formatCurrency(price));
	const resolvedPublishedAt = $derived(formatPublishedDate(publishedAt));
	const resolvedImage = $derived(imageUrl || null);
	const resolvedHref = $derived(href || (tipo && adId ? `/anuncio/${tipo}/${adId}` : ''));
</script>

<article
	class="card group h-full overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300-700"
>
	{#if resolvedHref}
		<a
			href={resolvedHref}
			class="block rounded-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
			aria-label={`Ver anúncio: ${resolvedTitle}`}
		>
			<div class="relative aspect-[4/3] overflow-hidden">
				{#if resolvedImage}
					<img
						src={resolvedImage}
						alt={resolvedTitle}
						loading="lazy"
						decoding="async"
						class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-surface-100-900 text-xs font-medium text-surface-700-300">
						Sem imagem
					</div>
				{/if}
				{#if sponsored}
					<span
						class="badge absolute left-2 top-2 preset-filled-warning-500 text-white"
					>
						Patrocinado
					</span>
				{/if}
			</div>

			<div class="p-3.5">
				<h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-surface-950-50">{resolvedTitle}</h3>
				<p class="mt-1 text-base font-bold tracking-tight text-primary-600-400">{resolvedPrice}</p>

				<div class="mt-2 flex items-center gap-1 text-xs text-surface-700-300">
					<MapPin class="h-3 w-3 shrink-0" aria-hidden="true" />
					<span class="truncate">{location}</span>
				</div>

				<div class="mt-2 flex items-center justify-between text-xs text-surface-700-300">
					<div class="flex items-center gap-1">
						<Eye class="h-3 w-3" aria-hidden="true" />
						<span>{views}</span>
					</div>
					<div class="flex items-center gap-1">
						<Clock class="h-3 w-3" aria-hidden="true" />
						<span>{resolvedPublishedAt}</span>
					</div>
				</div>
			</div>
		</a>
	{:else}
		<div class="relative aspect-[4/3] overflow-hidden">
			{#if resolvedImage}
				<img src={resolvedImage} alt={resolvedTitle} loading="lazy" decoding="async" class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center preset-tonal-primary text-xs font-medium text-primary-700">
					Sem imagem
				</div>
			{/if}
		</div>
		<div class="p-3">
			<h3 class="truncate text-sm font-medium text-surface-950-50">{resolvedTitle}</h3>
			<p class="mt-1 text-base font-bold text-primary-600">{resolvedPrice}</p>
		</div>
	{/if}
</article>
