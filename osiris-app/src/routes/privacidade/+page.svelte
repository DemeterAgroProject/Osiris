<script>
	import { resolve } from '$app/paths';
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { LEGAL } from '$lib/legal';
</script>

<LegalPage
	title="Política de privacidade"
	description="Como o Osiris coleta, usa e protege os seus dados pessoais, de acordo com a LGPD."
>
	<section>
		<p>
			O Osiris é um protótipo de marketplace para o agro, desenvolvido pelo {LEGAL.responsavel}. Esta
			política explica quais dados pessoais o app trata, para quê e quais são os seus direitos, conforme a Lei
			Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
		</p>
		<p>
			O app está em fase de testes. Durante esse período, os dados podem ser usados também para avaliar e
			melhorar o próprio app, sempre de forma agregada e sem divulgação de informações pessoais.
		</p>
	</section>

	<section>
		<h2>1. Quais dados tratamos</h2>
		<ul>
			<li>
				<strong>Dados da conta Google</strong>, recebidos quando você entra: nome, e-mail e foto de perfil. Não
				temos acesso à sua senha.
			</li>
			<li><strong>Dados que você informa</strong>: nome de exibição, telefone e foto, se preencher no perfil.</li>
			<li>
				<strong>Anúncios</strong>: títulos, descrições, preços, fotos (endereços de imagem), local e quantidades
				dos produtos, máquinas e serviços que você publica.
			</li>
			<li>
				<strong>Negociações e operações</strong>: propostas, valores, datas, mensagens do chat, motivos de
				cancelamento e avaliações.
			</li>
			<li><strong>Favoritos e notificações</strong> ligados à sua conta.</li>
			<li>
				<strong>Dados do aparelho para notificações</strong>: se você ativar as notificações, guardamos o
				endereço técnico de entrega fornecido pelo navegador.
			</li>
			<li>
				<strong>Dados técnicos</strong> registrados automaticamente pelos serviços de hospedagem (como endereço
				IP e data de acesso), usados para segurança e diagnóstico.
			</li>
			<li>
				<strong>Registros de uso e de erros do app</strong>: quais telas você abre e quais ações faz (por
				exemplo, iniciar ou publicar um anúncio, enviar uma proposta, termos buscados), com data e hora, e as
				falhas que acontecem na sua tela. Esses registros ficam ligados a um identificador da sessão e, se
				você estiver logado, à sua conta. <strong>Não</strong> registramos o texto das mensagens, e-mail,
				telefone nem o que você digita nos formulários.
			</li>
		</ul>
	</section>

	<section>
		<h2>2. Para que usamos</h2>
		<ul>
			<li>Criar e manter a sua conta e identificar você ao entrar (execução do serviço).</li>
			<li>Publicar anúncios e permitir negociações, operações e avaliações entre usuários.</li>
			<li>Enviar avisos sobre propostas, mensagens e mudanças nas suas operações.</li>
			<li>Proteger o app contra uso indevido e corrigir falhas (legítimo interesse).</li>
			<li>
				Avaliar a usabilidade do protótipo e corrigir falhas, a partir dos registros de uso e de erros, para
				fins acadêmicos. Os resultados publicados são sempre agregados, sem identificar participantes.
			</li>
		</ul>
		<p>Não vendemos dados pessoais e não usamos os seus dados para publicidade.</p>
	</section>

	<section>
		<h2>3. O que fica visível para outros usuários</h2>
		<p>
			Seu nome de exibição, foto, anúncios e as avaliações que você recebe são públicos dentro do app. Seu
			e-mail e telefone <strong>não</strong> são exibidos para outros usuários. Mensagens e propostas de uma
			negociação são vistas apenas pelas duas partes envolvidas.
		</p>
	</section>

	<section>
		<h2>4. Com quem compartilhamos</h2>
		<p>Os dados são tratados por fornecedores que operam a infraestrutura do app, apenas para esse fim:</p>
		<ul>
			<li><strong>Supabase</strong>: banco de dados, autenticação e envio de notificações.</li>
			<li><strong>Vercel</strong>: hospedagem do site.</li>
			<li><strong>Google</strong>: login com a conta Google.</li>
		</ul>
		<p>
			Esses serviços podem armazenar dados fora do Brasil, com as garantias previstas na LGPD. Também podemos
			compartilhar dados quando exigido por lei ou ordem judicial.
		</p>
	</section>

	<section>
		<h2>5. Por quanto tempo guardamos</h2>
		<p>
			Mantemos os dados enquanto a sua conta existir ou enquanto forem necessários para as finalidades acima. Os
			registros de uso e de erros são guardados até o fim do projeto. Ao final do projeto, ou a seu pedido, os
			dados pessoais serão excluídos ou anonimizados, exceto o que a lei obrigar a guardar.
		</p>
	</section>

	<section>
		<h2>6. Seus direitos</h2>
		<p>Pela LGPD, você pode pedir a qualquer momento:</p>
		<ul>
			<li>confirmação de que tratamos seus dados e acesso a eles;</li>
			<li>correção de dados incompletos ou desatualizados;</li>
			<li>exclusão da conta e dos dados pessoais;</li>
			<li>informações sobre com quem compartilhamos seus dados;</li>
			<li>revogação do consentimento, quando ele for a base do tratamento.</li>
		</ul>
		<p>
			Parte disso você faz direto no app (editar perfil, pausar ou apagar anúncios, desativar notificações no
			navegador). Para o resto, escreva para {LEGAL.contato}.
		</p>
	</section>

	<section>
		<h2>7. Segurança</h2>
		<p>
			O acesso aos dados é controlado no próprio banco: cada pessoa só lê e altera o que lhe pertence ou o que
			faz parte das suas negociações. Nenhum sistema é totalmente seguro; se houver um incidente que afete os
			seus dados, avisaremos você.
		</p>
	</section>

	<section>
		<h2>8. Contato e mudanças</h2>
		<p>
			Dúvidas sobre privacidade: {LEGAL.contato}. Esta política pode mudar; a data no topo indica a última
			atualização. Veja também os <a href={resolve('/termos')} class="font-medium text-primary-700 underline">Termos de uso</a>.
		</p>
	</section>
</LegalPage>
