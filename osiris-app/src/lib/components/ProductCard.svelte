<script>
	import { resolve } from '$app/paths';
	import { MapPin, Clock } from 'lucide-svelte';

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

	let { title, price, location = '', publishedAt, imageUrl, tipo = '', adId = '', href = '' } = $props();

	// imagem que falha ao carregar (link quebrado) cai no aviso "Sem imagem"
	let failedImage = $state(null);

	const resolvedTitle = $derived(title || 'Anúncio');
	const resolvedPrice = $derived(formatCurrency(price));
	const resolvedPublishedAt = $derived(formatPublishedDate(publishedAt));
	const resolvedImage = $derived(imageUrl && imageUrl !== failedImage ? imageUrl : null);
	const resolvedHref = $derived(href || (tipo && adId ? `/anuncio/${tipo}/${adId}` : ''));
</script>

{#snippet cover()}
	<div class="relative aspect-[4/3] overflow-hidden">
		{#if resolvedImage}
			<img
				src={resolvedImage}
				alt={resolvedTitle}
				class="h-full w-full object-cover"
				onerror={() => (failedImage = imageUrl)}
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center preset-tonal-primary text-xs font-medium text-primary-700">
				Sem imagem
			</div>
		{/if}
	</div>
{/snippet}

<article class="overflow-hidden rounded-container bg-surface-50-950 shadow-sm transition-shadow hover:shadow-md">
	{#if resolvedHref}
		<a href={resolve(resolvedHref)} class="block" aria-label={`Ver anúncio: ${resolvedTitle}`}>
			{@render cover()}

			<div class="p-3">
				<h3 class="truncate text-sm font-medium text-surface-950-50">{resolvedTitle}</h3>
				<p class="mt-1 text-base font-bold text-primary-600">{resolvedPrice}</p>

				<div class="mt-2 flex items-center justify-between gap-2 text-xs text-surface-600-400">
					{#if location}
						<div class="flex min-w-0 items-center gap-1">
							<MapPin class="h-3 w-3 shrink-0" />
							<span class="truncate">{location}</span>
						</div>
					{/if}
					<div class="ml-auto flex shrink-0 items-center gap-1">
						<Clock class="h-3 w-3" />
						<span>{resolvedPublishedAt}</span>
					</div>
				</div>
			</div>
		</a>
	{:else}
		{@render cover()}
		<div class="p-3">
			<h3 class="truncate text-sm font-medium text-surface-950-50">{resolvedTitle}</h3>
			<p class="mt-1 text-base font-bold text-primary-600">{resolvedPrice}</p>
		</div>
	{/if}
</article>
