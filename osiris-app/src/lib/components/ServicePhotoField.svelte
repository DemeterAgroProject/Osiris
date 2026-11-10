<script>
	import { Camera, Link, LoaderCircle, Trash2 } from 'lucide-svelte';
	import { m } from '$lib/paraglide/messages';
	import { trackError } from '$lib/telemetry';
	import { isValidImageUrl, removeListingPhotos, uploadListingPhoto } from '$lib/listingPhotos';

	// Foto de capa de um serviço (services.image_url): enviada pelo app ou colada como link.
	// savedUrl é a foto já gravada no serviço; ela só é apagada do armazenamento por quem salva.
	let {
		value = $bindable(''),
		uploading = $bindable(false),
		savedUrl = '',
		id = 'image_url',
		label = m.anunciar_servico_foto()
	} = $props();

	let showLink = $state(false);
	let errorMessage = $state('');

	const hasPhoto = $derived(isValidImageUrl(value));
	const linkInvalid = $derived(value.trim() !== '' && !hasPhoto);

	function discard(url) {
		// enviada agora e trocada antes de salvar
		if (url && url !== savedUrl) removeListingPhotos([url]);
	}

	async function handleFile(event) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		errorMessage = '';
		uploading = true;
		try {
			const url = await uploadListingPhoto(file);
			discard(value);
			value = url;
			showLink = false;
		} catch (error) {
			trackError('foto_envio_falhou', error);
			errorMessage = m.anunciar_foto_erro_envio();
		}
		uploading = false;
	}

	function removePhoto() {
		discard(value);
		value = '';
	}
</script>

<div class="space-y-2">
	<p class="text-sm font-semibold text-surface-950-50">{label}</p>

	{#if hasPhoto}
		<img src={value.trim()} alt={m.anunciar_servico_foto_previa_alt()} class="h-40 w-full rounded-container object-cover" />
	{/if}

	<div class="flex flex-wrap gap-2">
		<label
			class="btn preset-tonal-primary cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 {uploading ? 'pointer-events-none opacity-70' : ''}"
		>
			<input type="file" accept="image/*" class="sr-only" onchange={handleFile} disabled={uploading} />
			{#if uploading}
				<LoaderCircle size={18} class="animate-spin" />
				<span>{m.anunciar_foto_enviando()}</span>
			{:else}
				<Camera size={18} />
				<span>{hasPhoto ? m.anunciar_foto_trocar() : m.anunciar_foto_escolher()}</span>
			{/if}
		</label>

		{#if hasPhoto}
			<button type="button" onclick={removePhoto} class="btn preset-tonal-error" disabled={uploading}>
				<Trash2 size={18} />
				<span>{m.anunciar_img_remover()}</span>
			</button>
		{/if}
		{#if !showLink && !hasPhoto}
			<button type="button" onclick={() => (showLink = true)} class="btn preset-tonal" disabled={uploading}>
				<Link size={18} />
				<span>{m.anunciar_foto_usar_link()}</span>
			</button>
		{/if}
	</div>

	{#if showLink}
		<label class="sr-only" for={id}>{m.anunciar_ph_link_foto()}</label>
		<input
			type="url"
			{id}
			bind:value
			placeholder={m.anunciar_ph_link_foto()}
			class="input h-12 w-full rounded-container border border-surface-200-800 bg-surface-50-950 px-4 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
		/>
	{/if}

	{#if errorMessage}
		<p class="text-sm font-medium text-error-600-400" role="alert">{errorMessage}</p>
	{:else if linkInvalid}
		<p class="text-sm font-medium text-error-600-400">{m.anunciar_servico_foto_invalida()}</p>
	{:else if !hasPhoto}
		<p class="text-sm font-medium text-warning-700-300">{m.anunciar_foto_obrigatoria()}</p>
	{/if}
</div>
