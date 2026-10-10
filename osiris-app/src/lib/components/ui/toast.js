import { createToaster } from '@skeletonlabs/skeleton-svelte';

// fila única de toasts do app, exibida pelo AppToaster no +layout.svelte
export const toaster = createToaster({
	placement: 'bottom',
	duration: 4000,
	// acima da barra de navegação inferior
	offsets: { top: '1rem', right: '1rem', bottom: '6rem', left: '1rem' }
});

/**
 * Mostra um toast de qualquer tela.
 * @param {string} message
 * @param {'info' | 'success' | 'warning' | 'error'} [type]
 */
export function showToast(message, type = 'info') {
	toaster.create({ description: message, type });
}
