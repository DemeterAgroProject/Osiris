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
		<p class="text-sm font-medium text-gray-700">Imagens (URL)</p>
		<button
			type="button"
			onclick={addImage}
			class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
		>
			<ImagePlus class="size-3.5" />
			Adicionar
		</button>
	</div>

	{#each visibleImages as image, index (image.id ?? `new-${index}-${image.url}`)}
		<div class="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
			<label class="mb-1 block text-xs font-medium text-gray-600" for={`product-image-url-${index}`}>
				URL da imagem {index + 1}
			</label>
			<input
				id={`product-image-url-${index}`}
				type="url"
				bind:value={image.url}
				placeholder="https://..."
				class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
			/>

			<div class="mt-2 flex items-center justify-between gap-2">
				<button
					type="button"
					onclick={() => setCover(index)}
					class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors {image.is_cover
						? 'bg-green-100 text-green-800'
						: 'text-gray-600 hover:bg-gray-100'}"
				>
					<Star class="size-3.5 {image.is_cover ? 'fill-current' : ''}" />
					{image.is_cover ? 'Capa' : 'Definir como capa'}
				</button>

				<button
					type="button"
					onclick={() => removeImage(index)}
					class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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
					class="mt-3 h-28 w-full rounded-lg border border-gray-200 object-cover"
					onerror={(event) => {
						event.currentTarget.style.display = 'none';
					}}
				/>
			{:else if image.url?.trim()}
				<p class="mt-2 text-xs text-amber-700">Informe uma URL válida começando com http:// ou https://</p>
			{/if}
		</div>
	{/each}

	<p class="text-xs text-gray-500">A primeira capa aparece nos cards e na busca. Serviços não usam esta galeria.</p>
</div>
