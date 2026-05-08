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

<article class="overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md">
	{#if resolvedHref}
		<a href={resolvedHref} class="block" aria-label={`Ver anúncio: ${resolvedTitle}`}>
			<div class="relative aspect-[4/3] overflow-hidden">
				{#if resolvedImage}
					<img src={resolvedImage} alt={resolvedTitle} class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-100 to-emerald-50 text-xs font-medium text-green-700">
						Sem imagem
					</div>
				{/if}
				{#if sponsored}
					<span
						class="absolute left-2 top-2 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white"
					>
						Patrocinado
					</span>
				{/if}
			</div>

			<div class="p-3">
				<h3 class="truncate text-sm font-medium text-gray-900">{resolvedTitle}</h3>
				<p class="mt-1 text-base font-bold text-green-600">{resolvedPrice}</p>

				<div class="mt-2 flex items-center gap-1 text-xs text-gray-500">
					<MapPin class="h-3 w-3" />
					<span class="truncate">{location}</span>
				</div>

				<div class="mt-2 flex items-center justify-between text-xs text-gray-400">
					<div class="flex items-center gap-1">
						<Eye class="h-3 w-3" />
						<span>{views}</span>
					</div>
					<div class="flex items-center gap-1">
						<Clock class="h-3 w-3" />
						<span>{resolvedPublishedAt}</span>
					</div>
				</div>
			</div>
		</a>
	{:else}
		<div class="relative aspect-[4/3] overflow-hidden">
			{#if resolvedImage}
				<img src={resolvedImage} alt={resolvedTitle} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-100 to-emerald-50 text-xs font-medium text-green-700">
					Sem imagem
				</div>
			{/if}
		</div>
		<div class="p-3">
			<h3 class="truncate text-sm font-medium text-gray-900">{resolvedTitle}</h3>
			<p class="mt-1 text-base font-bold text-green-600">{resolvedPrice}</p>
		</div>
	{/if}
</article>
