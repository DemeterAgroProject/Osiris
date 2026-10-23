import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// textos do app em pt/en/es (messages/*.json), compilados em src/lib/paraglide
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// escolha salva (cookie) > idioma do navegador > português
			strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
			cookieName: 'osiris-idioma'
		})
	]
});
