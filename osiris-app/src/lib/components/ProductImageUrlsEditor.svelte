<script>
	import { ImagePlus, Star, Trash2 } from 'lucide-svelte';

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
		<p class="text-sm font-medium text-surface-700-300">Imagens (URL)</p>
		<button
			type="button"
			onclick={addImage}
			class="inline-flex items-center gap-1 rounded-container border border-surface-200-800 px-2.5 py-1.5 text-xs font-medium text-surface-700-300 hover:preset-tonal"
		>
			<ImagePlus class="size-3.5" />
			Adicionar
		</button>
	</div>

	{#each visibleImages as image, index (image.id ?? `new-${index}-${image.url}`)}
		<div class="rounded-container border border-surface-200-800 bg-surface-50-950/80 p-3">
			<label class="mb-1 block text-xs font-medium text-surface-700-300" for={`product-image-url-${index}`}>
				URL da imagem {index + 1}
			</label>
			<input
				id={`product-image-url-${index}`}
				type="url"
				bind:value={image.url}
				placeholder="https://..."
				class="input w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
			/>

			<div class="mt-2 flex items-center justify-between gap-2">
				<button
					type="button"
					onclick={() => setCover(index)}
					class="inline-flex items-center gap-1 rounded-container px-2 py-1 text-xs font-medium transition-colors {image.is_cover
						? 'preset-tonal-primary text-primary-700'
						: 'text-surface-700-300 hover:preset-tonal'}"
				>
					<Star class="size-3.5 {image.is_cover ? 'fill-current' : ''}" />
					{image.is_cover ? 'Capa' : 'Definir como capa'}
				</button>

				<button
					type="button"
					onclick={() => removeImage(index)}
					class="inline-flex items-center gap-1 rounded-container px-2 py-1 text-xs font-medium text-error-500 hover:preset-tonal-error"
					aria-label="Remover imagem"
				>
					<Trash2 class="size-3.5" />
					Remover
				</button>
			</div>

			{#if isValidImageUrl(image.url)}
				<img
					src={image.url.trim()}
					alt="Prévia"
					class="mt-3 h-28 w-full rounded-container border border-surface-200-800 object-cover"
					onerror={(event) => {
						event.currentTarget.style.display = 'none';
					}}
				/>
			{:else if image.url?.trim()}
				<p class="mt-2 text-xs text-warning-700">Informe uma URL válida começando com http:// ou https://</p>
			{/if}
		</div>
	{/each}

	<p class="text-xs text-surface-700-300">A primeira capa aparece nos cards e na busca. Serviços não usam esta galeria.</p>
</div>
