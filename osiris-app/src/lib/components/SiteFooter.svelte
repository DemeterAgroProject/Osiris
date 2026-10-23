<script>
	import { resolve } from '$app/paths';
	import { Mail } from 'lucide-svelte';
	import { LEGAL } from '$lib/legal';
	import { m } from '$lib/paraglide/messages';

	// rodapé do computador; no celular a navegação fica na barra inferior
	const NAV_LINKS = [
		{ href: '/', label: m.nav_inicio },
		{ href: '/buscar', label: m.app_footer_buscar_anuncios },
		{ href: '/inventario', label: m.app_meu_inventario },
		{ href: '/painel-de-controle', label: m.app_painel_controle }
	];
</script>

<footer class="mt-12 hidden border-t border-surface-200-800 bg-surface-50-950 lg:block">
	<div class="mx-auto grid max-w-7xl grid-cols-3 gap-8 px-8 py-10">
		<div>
			<a href={resolve('/')} class="flex items-center gap-2">
				<img src="/logo_black.png" alt="" class="h-9" />
				<span class="text-lg font-bold text-surface-950-50">Osiris</span>
			</a>
			<p class="mt-3 max-w-xs preset-typo-body-2 text-surface-800-200">
				{m.app_footer_slogan()}
			</p>
		</div>

		<nav aria-label={m.app_footer_navegacao_aria()}>
			<p class="preset-typo-label">{m.app_footer_navegacao()}</p>
			<ul class="mt-3 space-y-2">
				{#each NAV_LINKS as link (link.href)}
					<li>
						<a href={resolve(link.href)} class="text-sm text-surface-900-100 hover:text-primary-700-300">{link.label()}</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div>
			<p class="preset-typo-label">{m.app_footer_ajuda_termos()}</p>
			<ul class="mt-3 space-y-2 text-sm">
				<li><a href={resolve('/ajuda')} class="text-surface-900-100 hover:text-primary-700-300">{m.app_central_ajuda()}</a></li>
				<li>
					<a href="mailto:{LEGAL.contato}" class="inline-flex items-center gap-2 text-surface-900-100 hover:text-primary-700-300">
						<Mail size={16} />
						{LEGAL.contato}
					</a>
				</li>
				<li><a href={resolve('/termos')} class="text-surface-900-100 underline hover:text-primary-700-300">{m.app_termos_uso()}</a></li>
				<li><a href={resolve('/privacidade')} class="text-surface-900-100 underline hover:text-primary-700-300">{m.app_politica_privacidade()}</a></li>
			</ul>
		</div>
	</div>
	<p class="border-t border-surface-200-800 py-4 text-center preset-typo-caption">{LEGAL.responsavel}</p>
</footer>
