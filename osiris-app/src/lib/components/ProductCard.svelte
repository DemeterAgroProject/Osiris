<script>
	import { resolve } from '$app/paths';
	import { MapPin, Clock, Briefcase, Tractor, Leaf, ImageOff, Eye } from 'lucide-svelte';
	import { listingPriceLabel, MACHINE_OFFER_LABEL } from '$lib/pricing';
	import { m } from '$lib/paraglide/messages';
	import { intlLocale } from '$lib/i18n';

	// "há 3 h", "3h ago", "hace 3 h": tempo relativo no idioma atual
	function formatPublishedDate(value) {
		if (!value) return m.busca_agora();
		const published = new Date(value);
		if (Number.isNaN(published.getTime())) return m.busca_agora();

		const diffInHours = Math.floor((Date.now() - published.getTime()) / (1000 * 60 * 60));
		if (diffInHours < 1) return m.busca_agora();
		const relative = new Intl.RelativeTimeFormat(intlLocale(), { style: 'narrow' });
		if (diffInHours < 24) return relative.format(-diffInHours, 'hour');
		return relative.format(-Math.floor(diffInHours / 24), 'day');
	}

	// selo sobre a foto: diz de cara o que é o anúncio (label guarda a função da mensagem)
	const TYPE_BADGE = {
		maquinario: { label: m.comum_maquina, icon: Tractor, tone: 'preset-filled-primary-500' },
		produto: { label: m.busca_badge_produto, icon: Leaf, tone: 'preset-filled-tertiary-500' },
		servico: { label: m.comum_servico, icon: Briefcase, tone: 'preset-filled-secondary-500' }
	};

	let { title, price, pricingModel = null, priceUnit = null, location = '', publishedAt, imageUrl, tipo = '', adId = '', href = '', description = '' } = $props();

	// imagem que falha ao carregar (link quebrado) cai no aviso "Sem imagem"
	let failedImage = $state(null);

	const resolvedTitle = $derived(title || m.busca_anuncio_padrao());
	const resolvedPrice = $derived(listingPriceLabel(tipo, price, pricingModel, priceUnit));
	// "R$ 280,00 / ha": valor em destaque, unidade menor (cabe numa linha no card);
	// o valor vai até o último algarismo, para servir ao formato de qualquer idioma ("R$280.00 / ha")
	const priceParts = $derived(resolvedPrice.match(/^(\D*\d[\d.,]*)\s*(.*)$/u) ?? [resolvedPrice, resolvedPrice, '']);
	const resolvedPublishedAt = $derived(formatPublishedDate(publishedAt));
	const resolvedImage = $derived(imageUrl && imageUrl !== failedImage ? imageUrl : null);
	const resolvedHref = $derived(href || (tipo && adId ? `/anuncio/${tipo}/${adId}` : ''));
	const badge = $derived(TYPE_BADGE[tipo] ?? null);
	// máquina: pricingModel guarda o offer_type (venda/aluguel)
	const badgeLabel = $derived(
		tipo === 'maquinario' && MACHINE_OFFER_LABEL[pricingModel]
			? `${badge?.label()} · ${MACHINE_OFFER_LABEL[pricingModel]}`
			: badge?.label()
	);
</script>

{#snippet priceLine()}
	<p class="mt-1 flex flex-wrap items-baseline gap-x-1 text-lg font-bold leading-tight text-primary-700-300">
		<span class="whitespace-nowrap">{priceParts[1]}</span>{#if priceParts[2]}<span class="ml-1 text-xs font-medium text-surface-800-200">{priceParts[2]}</span>{/if}
	</p>
{/snippet}

{#snippet cover()}
	<div class="relative aspect-[4/3] overflow-hidden bg-surface-100-900">
		{#if resolvedImage}
			<img
				src={resolvedImage}
				alt={resolvedTitle}
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				onerror={() => (failedImage = imageUrl)}
			/>
		{:else}
			<div class="flex h-full w-full flex-col items-center justify-center gap-1.5 preset-tonal-primary text-xs font-medium text-primary-700-300">
				{#if badge}
					<badge.icon class="h-8 w-8" strokeWidth={1.5} />
				{:else}
					<ImageOff class="h-8 w-8" strokeWidth={1.5} />
				{/if}
				{m.busca_sem_foto()}
			</div>
		{/if}

		{#if badge}
			<span class="badge absolute left-2 top-2 gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-sm {badge.tone}">
				<badge.icon class="h-3.5 w-3.5" />
				{badgeLabel}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet details()}
	<div class="flex flex-1 flex-col p-3">
		<h3 class="line-clamp-2 min-h-[2.7em] preset-typo-card-title">{resolvedTitle}</h3>
		{#if description}
			<!-- computador: uma linha da descrição, como no Stitch -->
			<p class="mt-1 hidden truncate preset-typo-caption lg:block">{description}</p>
		{/if}
		{@render priceLine()}

		{#if resolvedHref}
			<div class="mt-auto space-y-1 pt-2 text-xs text-surface-800-200">
				{#if location}
					<div class="flex min-w-0 items-center gap-1">
						<MapPin class="h-3.5 w-3.5 shrink-0 text-primary-600-400" />
						<span class="truncate">{location}</span>
					</div>
				{/if}
				<div class="flex items-center gap-1">
					<Clock class="h-3.5 w-3.5 shrink-0" />
					<span>{resolvedPublishedAt}</span>
				</div>
			</div>
			<!-- computador: deixa claro que o card abre o anúncio (o card inteiro já é o link) -->
			<span class="btn preset-tonal-primary mt-3 hidden w-full lg:inline-flex" aria-hidden="true">
				<Eye size={18} />
				<span>{m.busca_ver_detalhes()}</span>
			</span>
		{/if}
	</div>
{/snippet}

<article class="group h-full overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 shadow-sm transition-shadow hover:shadow-md">
	{#if resolvedHref}
		<a href={resolve(resolvedHref)} class="flex h-full flex-col" aria-label={m.busca_ver_anuncio_titulo({ titulo: resolvedTitle })}>
			{@render cover()}
			{@render details()}
		</a>
	{:else}
		<div class="flex h-full flex-col">
			{@render cover()}
			{@render details()}
		</div>
	{/if}
</article>
