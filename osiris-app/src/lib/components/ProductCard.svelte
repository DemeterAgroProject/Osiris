<script>
	import { MapPin, Eye, Clock } from 'lucide-svelte';

	let { title, price, location, views, publishedAt, imageUrl, sponsored = false } = $props();
</script>

<article class="overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md">
	<div class="relative aspect-[4/3] overflow-hidden">
		<img src={imageUrl} alt={title} class="h-full w-full object-cover" />
		{#if sponsored}
			<span
				class="absolute left-2 top-2 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white"
			>
				Patrocinado
			</span>
		{/if}
	</div>

	<div class="p-3">
		<h3 class="truncate text-sm font-medium text-gray-900">{title}</h3>
		<p class="mt-1 text-base font-bold text-green-600">{price}</p>

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
				<span>{publishedAt}</span>
			</div>
		</div>
	</div>
</article>
