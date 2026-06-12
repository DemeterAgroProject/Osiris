<script>
	let { imageSrc, imageAlt = '', title, description } = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="flex flex-1 items-center justify-center px-6 py-6">
		<img
			src={imageSrc}
			alt={imageAlt || title}
			class="max-h-[min(42vh,320px)] w-full max-w-xs object-contain sm:max-w-sm"
			loading="lazy"
			decoding="async"
		/>
	</div>

	<div class="shrink-0 px-6 pb-2 text-center">
		<h1 class="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>
	</div>
</div>
