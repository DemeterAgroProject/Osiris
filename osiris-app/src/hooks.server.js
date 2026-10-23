import { paraglideMiddleware } from '$lib/paraglide/server';

// idioma de cada requisição (cookie da escolha da pessoa ou Accept-Language) e o lang do <html>
/** @type {import('@sveltejs/kit').Handle} */
export const handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});
