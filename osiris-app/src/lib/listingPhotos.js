import { supabase } from '$lib/supabase';

// Fotos de anúncios: o app reduz e comprime a imagem no próprio aparelho antes de enviar, para caber
// bem no armazenamento do Supabase (cerca de 150 a 300 KB por foto). Cada usuário grava só na própria
// pasta do bucket (policy em storage.objects).

export const PHOTO_BUCKET = 'machinery-images';
export const MAX_PHOTOS = 6;

const MAX_SIDE = 1600; // px no lado maior
const QUALITY = 0.8;
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // arquivos maiores nem são abertos

/** Link http(s) válido de imagem. */
export function isValidImageUrl(value) {
	const trimmed = value?.trim();
	if (!trimmed) return false;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

function canvasToBlob(canvas, type) {
	return new Promise((resolveBlob) => canvas.toBlob(resolveBlob, type, QUALITY));
}

/**
 * Reduz a foto para no máximo MAX_SIDE px e converte para WebP (ou JPEG, onde o navegador não gera WebP).
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function compressPhoto(file) {
	if (!file?.type?.startsWith('image/') || file.size > MAX_INPUT_BYTES) throw new Error('foto_invalida');

	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	let blob = await canvasToBlob(canvas, 'image/webp');
	// Safari antigo devolve PNG quando não sabe gerar WebP
	if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg');
	if (!blob) throw new Error('foto_invalida');
	return blob;
}

/**
 * Comprime e envia a foto para a pasta do usuário logado. Devolve a URL pública.
 * @param {File} file
 */
export async function uploadListingPhoto(file) {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('sem_login');

	const blob = await compressPhoto(file);
	const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
	const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

	const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
		contentType: blob.type,
		cacheControl: '31536000',
		upsert: false
	});
	if (error) throw error;

	return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Caminho no bucket de uma URL pública do próprio app; null para links externos. */
export function photoPathFromUrl(url) {
	const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
	const index = String(url ?? '').indexOf(marker);
	return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

/**
 * Apaga do armazenamento as fotos enviadas pelo app que deixaram de ser usadas. Melhor esforço:
 * links externos são ignorados e uma falha não interrompe o fluxo.
 * @param {string[]} urls
 */
export async function removeListingPhotos(urls) {
	const paths = (urls ?? []).map(photoPathFromUrl).filter(Boolean);
	if (!paths.length) return;
	const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
	if (error) console.warn('Não foi possível apagar fotos antigas:', error.message);
}
