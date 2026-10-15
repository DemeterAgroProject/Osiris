<script>
	import { resolve } from '$app/paths';
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { LEGAL } from '$lib/legal';
</script>

<LegalPage title="Termos de uso" description="Regras de uso do marketplace Osiris.">
	<section>
		<p>
			O Osiris é um protótipo de marketplace para o agro, desenvolvido pelo {LEGAL.responsavel}. Ao entrar no
			app, você concorda com estes termos e com a
			<a href={resolve('/privacidade')} class="font-medium text-primary-700 underline">Política de privacidade</a>.
		</p>
	</section>

	<section>
		<h2>1. O que o Osiris faz</h2>
		<p>
			O Osiris aproxima quem anuncia máquinas, produtos e serviços do agro de quem procura por eles. O app
			permite publicar anúncios, enviar propostas, conversar, registrar a operação combinada e avaliar a outra
			parte.
		</p>
		<p>
			O Osiris <strong>não</strong> processa pagamentos, não é parte dos negócios fechados entre os usuários e
			não garante a qualidade, a entrega ou a existência do que é anunciado. Pagamento, entrega e demais
			condições são combinados diretamente entre as partes.
		</p>
	</section>

	<section>
		<h2>2. Fase de testes</h2>
		<p>
			O app está em desenvolvimento e pode ter falhas, ficar fora do ar ou mudar sem aviso. Anúncios de
			demonstração podem aparecer na vitrine, e dados de teste podem ser apagados. Não use o Osiris para
			negócios que dependam exclusivamente dele.
		</p>
	</section>

	<section>
		<h2>3. Sua conta</h2>
		<ul>
			<li>O acesso é feito com uma conta Google; você é responsável pelo que for feito com ela.</li>
			<li>Mantenha seus dados de perfil corretos e não se passe por outra pessoa ou empresa.</li>
		</ul>
	</section>

	<section>
		<h2>4. Anúncios e negociações</h2>
		<ul>
			<li>Anuncie só o que você pode vender, alugar ou prestar, com descrição, fotos e preço verdadeiros.</li>
			<li>
				É proibido anunciar itens ilegais, roubados, falsificados ou que exijam autorização que você não tem
				(como defensivos sem registro).
			</li>
			<li>Propostas aceitas viram operações; cancelamentos precisam de um motivo e ficam registrados.</li>
			<li>Avaliações devem refletir a experiência real, sem ofensas.</li>
		</ul>
	</section>

	<section>
		<h2>5. Condutas proibidas</h2>
		<ul>
			<li>Enviar conteúdo ofensivo, discriminatório, enganoso ou que viole direitos de terceiros.</li>
			<li>Usar o app para spam, golpes ou para coletar dados de outros usuários.</li>
			<li>Tentar acessar dados ou funções que não são suas, ou atrapalhar o funcionamento do app.</li>
		</ul>
		<p>
			Podemos remover conteúdo e suspender contas que descumpram estes termos.
		</p>
	</section>

	<section>
		<h2>6. Responsabilidade</h2>
		<p>
			Cada usuário responde pelo que publica e pelos negócios que fecha. Na medida permitida pela lei, o
			projeto não se responsabiliza por perdas decorrentes de negócios entre usuários ou de indisponibilidade
			do app.
		</p>
	</section>

	<section>
		<h2>7. Mudanças e contato</h2>
		<p>
			Estes termos podem ser atualizados; a data no topo indica a última versão. Eles seguem a lei brasileira.
			Dúvidas: {LEGAL.contato}.
		</p>
	</section>
</LegalPage>
