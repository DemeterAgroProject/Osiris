<script>
	import { ImageOff, ImagePlus, Images, Star, Trash2 } from 'lucide-svelte';

	function createEmptyImageRow(isCover = false) {
		return { id: null, url: '', is_cover: isCover, removed: false };
	}

	function isValidImageUrl(value) {
		const trimmed = value?.trim();
		if (!trimmed) return false;
		try {
			const parsed = new URL(trimmed);
			return parsed.protocol === 'http:' || parsed.protocol === 'https:';
		} catch {
			return false;
		}
	}

	let { images = $bindable([createEmptyImageRow(true)]) } = $props();

	const visibleImages = $derived((images ?? []).filter((img) => !img.removed));

	function addImage() {
		images = [...images, createEmptyImageRow(visibleImages.length === 0)];
	}

	function removeImage(index) {
		const target = visibleImages[index];
		if (!target) return;

		if (target.id) {
			images = images.map((img) => (img === target ? { ...img, removed: true } : img));
		} else {
			images = images.filter((img) => img !== target);
		}

		if (!images.some((img) => !img.removed)) {
			images = [createEmptyImageRow(true)];
			return;
		}

		if (!images.some((img) => !img.removed && img.is_cover)) {
			const first = images.find((img) => !img.removed);
			if (first) first.is_cover = true;
			images = [...images];
		}
	}

	function setCover(index) {
		const target = visibleImages[index];
		if (!target) return;

		images = images.map((img) =>
			!img.removed ? { ...img, is_cover: img === target } : img
		);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<p class="flex items-center gap-2 text-base font-bold text-surface-950-50">
			<Images class="h-5 w-5 text-primary-700-300" />
			Fotos (link da imagem)
		</p>
		<button
			type="button"
			onclick={addImage}
			class="btn preset-tonal-primary"
		>
			<ImagePlus size={18} />
			<span>Adicionar</span>
		</button>
	</div>

	{#each visibleImages as image, index (image.id ?? `new-${index}-${image.url}`)}
		<div class="flex gap-3 rounded-container bg-surface-100-900 p-3">
			<div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-container border border-surface-200-800 bg-surface-50-950 text-surface-700-300">
				{#if isValidImageUrl(image.url)}
					<img
						src={image.url.trim()}
						alt="Prévia da foto {index + 1}"
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
				<label class="sr-only" for={`product-image-url-${index}`}>Link da foto {index + 1}</label>
				<input
					id={`product-image-url-${index}`}
					type="url"
					bind:value={image.url}
					placeholder="Cole o link da foto (https://...)"
					class="input h-11 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
				/>

				{#if image.url?.trim() && !isValidImageUrl(image.url)}
					<p class="mt-1 text-xs font-medium text-warning-700-300">O link precisa começar com http:// ou https://</p>
				{/if}

				<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
					<button
						type="button"
						onclick={() => setCover(index)}
						class="btn {image.is_cover ? 'preset-filled-primary-500' : 'preset-tonal'}"
					>
						<Star size={18} class={image.is_cover ? 'fill-current' : ''} />
						<span>{image.is_cover ? 'Foto de capa' : 'Usar como capa'}</span>
					</button>

					<button
						type="button"
						onclick={() => removeImage(index)}
						class="btn preset-tonal-error"
						aria-label="Remover foto {index + 1}"
					>
						<Trash2 size={18} />
						<span>Remover</span>
					</button>
				</div>
			</div>
		</div>
	{/each}

	<p class="text-sm text-surface-800-200">A foto de capa aparece nos cards e na busca.</p>
</div>
