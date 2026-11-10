<script>
	import { Camera, ImageOff, Images, Link, LoaderCircle, Star, Trash2 } from 'lucide-svelte';
	import { m } from '$lib/paraglide/messages';
	import { trackError } from '$lib/telemetry';
	import { MAX_PHOTOS, isValidImageUrl, removeListingPhotos, uploadListingPhoto } from '$lib/listingPhotos';

	// Linhas: { id (product_images.id ou null), url, is_cover, removed, link (true = campo de link digitado) }
	let { images = $bindable([]), uploading = $bindable(false), required = false } = $props();

	let errorMessage = $state('');

	const visibleImages = $derived((images ?? []).filter((img) => !img.removed));
	const validCount = $derived(visibleImages.filter((img) => isValidImageUrl(img.url)).length);
	const canAddMore = $derived(visibleImages.length < MAX_PHOTOS);

	function ensureCover() {
		const active = images.filter((img) => !img.removed);
		if (active.length && !active.some((img) => img.is_cover)) {
			active[0].is_cover = true;
			images = [...images];
		}
	}

	async function handleFiles(event) {
		const input = event.currentTarget;
		const files = [...(input.files ?? [])].slice(0, MAX_PHOTOS - visibleImages.length);
		input.value = '';
		if (!files.length) return;

		errorMessage = '';
		uploading = true;
		for (const file of files) {
			try {
				const url = await uploadListingPhoto(file);
				images = [...images, { id: null, url, is_cover: false, removed: false, link: false }];
				ensureCover();
			} catch (error) {
				trackError('foto_envio_falhou', error);
				errorMessage = m.anunciar_foto_erro_envio();
			}
		}
		uploading = false;
	}

	function addLinkRow() {
		errorMessage = '';
		images = [...images, { id: null, url: '', is_cover: false, removed: false, link: true }];
		ensureCover();
	}

	function removeImage(index) {
		const target = visibleImages[index];
		if (!target) return;

		if (target.id) {
			// já salva no anúncio: apaga ao salvar a edição
			images = images.map((img) => (img === target ? { ...img, removed: true, is_cover: false } : img));
		} else {
			images = images.filter((img) => img !== target);
			// enviada agora e descartada antes de publicar
			removeListingPhotos([target.url]);
		}
		ensureCover();
	}

	function setCover(index) {
		const target = visibleImages[index];
		if (!target) return;
		images = images.map((img) => (!img.removed ? { ...img, is_cover: img === target } : img));
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<p class="flex items-center gap-2 text-base font-bold text-surface-950-50">
			<Images class="h-5 w-5 text-primary-700-300" />
			{m.anunciar_img_titulo()}
		</p>
		<span class="text-sm text-surface-700-300">{m.anunciar_foto_contagem({ n: visibleImages.length, max: MAX_PHOTOS })}</span>
	</div>

	{#each visibleImages as image, index (image.id ?? `new-${index}-${image.url}`)}
		<div class="flex gap-3 rounded-container bg-surface-100-900 p-3">
			<div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 text-surface-700-300">
				{#if isValidImageUrl(image.url)}
					<img
						src={image.url.trim()}
						alt={m.anunciar_img_previa_alt({ n: index + 1 })}
						class="h-full w-full object-cover"
						onerror={(event) => {
							event.currentTarget.style.display = 'none';
						}}
					/>
				{:else}
					<ImageOff class="h-7 w-7" strokeWidth={1.5} />
				{/if}
				<span class="absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1 text-xs font-bold text-white">
					{index + 1}
				</span>
			</div>

			<div class="min-w-0 flex-1">
				{#if image.link}
					<label class="sr-only" for={`product-image-url-${index}`}>{m.anunciar_img_link_label({ n: index + 1 })}</label>
					<input
						id={`product-image-url-${index}`}
						type="url"
						bind:value={image.url}
						placeholder={m.anunciar_ph_link_foto()}
						class="input h-11 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
					/>
					{#if image.url?.trim() && !isValidImageUrl(image.url)}
						<p class="mt-1 text-xs font-medium text-warning-700-300">{m.anunciar_img_link_invalido()}</p>
					{/if}
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-2 {image.link ? 'mt-2' : ''}">
					<button
						type="button"
						onclick={() => setCover(index)}
						class="btn {image.is_cover ? 'preset-filled-primary-500' : 'preset-tonal'}"
					>
						<Star size={18} class={image.is_cover ? 'fill-current' : ''} />
						<span>{image.is_cover ? m.anunciar_img_capa() : m.anunciar_img_usar_capa()}</span>
					</button>

					<button
						type="button"
						onclick={() => removeImage(index)}
						class="btn preset-tonal-error"
						aria-label={m.anunciar_img_remover_aria({ n: index + 1 })}
					>
						<Trash2 size={18} />
						<span>{m.anunciar_img_remover()}</span>
					</button>
				</div>
			</div>
		</div>
	{/each}

	{#if canAddMore}
		<label
			class="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-container border-2 border-dashed border-primary-500/60 bg-primary-50-950/40 p-4 text-center text-primary-800-200 transition-colors hover:bg-primary-100-900/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 {uploading ? 'pointer-events-none opacity-70' : ''}"
		>
			<input type="file" accept="image/*" multiple class="sr-only" onchange={handleFiles} disabled={uploading} />
			{#if uploading}
				<LoaderCircle class="h-7 w-7 animate-spin" />
				<span class="font-semibold">{m.anunciar_foto_enviando()}</span>
			{:else}
				<Camera class="h-7 w-7" />
				<span class="font-semibold">{m.anunciar_foto_adicionar()}</span>
				<span class="text-xs text-surface-700-300">{m.anunciar_foto_adicionar_dica()}</span>
			{/if}
		</label>

		<button type="button" onclick={addLinkRow} class="btn btn-sm preset-tonal" disabled={uploading}>
			<Link size={16} />
			<span>{m.anunciar_foto_usar_link()}</span>
		</button>
	{/if}

	{#if errorMessage}
		<p class="text-sm font-medium text-error-600-400" role="alert">{errorMessage}</p>
	{:else if required && validCount === 0}
		<p class="text-sm font-medium text-warning-700-300">{m.anunciar_foto_obrigatoria()}</p>
	{/if}

	<p class="text-sm text-surface-800-200">{m.anunciar_img_dica()}</p>
</div>
