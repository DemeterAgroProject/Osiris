<script>
	import { resolve } from '$app/paths';
	import { Mail } from 'lucide-svelte';
	import { LEGAL } from '$lib/legal';

	// rodapé do computador; no celular a navegação fica na barra inferior
	const NAV_LINKS = [
		{ href: '/', label: 'Início' },
		{ href: '/buscar', label: 'Buscar anúncios' },
		{ href: '/inventario', label: 'Meu inventário' },
		{ href: '/painel-de-controle', label: 'Painel de controle' }
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
				Máquinas, produtos e serviços do campo em um só lugar.
			</p>
		</div>

		<nav aria-label="Navegação do rodapé">
			<p class="preset-typo-label">Navegação</p>
			<ul class="mt-3 space-y-2">
				{#each NAV_LINKS as link (link.href)}
					<li>
						<a href={resolve(link.href)} class="text-sm text-surface-900-100 hover:text-primary-700-300">{link.label}</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div>
			<p class="preset-typo-label">Contato e termos</p>
			<ul class="mt-3 space-y-2 text-sm">
				<li>
					<a href="mailto:{LEGAL.contato}" class="inline-flex items-center gap-2 text-surface-900-100 hover:text-primary-700-300">
						<Mail size={16} />
						{LEGAL.contato}
					</a>
				</li>
				<li><a href={resolve('/termos')} class="text-surface-900-100 underline hover:text-primary-700-300">Termos de uso</a></li>
				<li><a href={resolve('/privacidade')} class="text-surface-900-100 underline hover:text-primary-700-300">Política de privacidade</a></li>
			</ul>
		</div>
	</div>
	<p class="border-t border-surface-200-800 py-4 text-center preset-typo-caption">{LEGAL.responsavel}</p>
</footer>
