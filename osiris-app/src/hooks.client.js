import { trackError } from '$lib/telemetry';

// erros não tratados ao carregar ou renderizar uma página (os mesmos que levam ao +error.svelte)
/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error, event, status, message }) {
	trackError('erro_de_pagina', error ?? message, { status, route: event.route?.id ?? '' });
	return { message };
}
