// Conteúdo da central de ajuda (/ajuda). Cada artigo segue o mesmo roteiro:
// para que serve, onde fica no app, passo a passo e observações.

import { Sprout, Search, Megaphone, MessageSquare, Tractor, ShieldCheck } from 'lucide-svelte';

/**
 * @typedef {{ label: string, text: string, href?: string }} HelpPlace
 * @typedef {{
 *   slug: string,
 *   section: string,
 *   title: string,
 *   summary: string,
 *   objetivo: string,
 *   onde: HelpPlace[],
 *   passos: string[],
 *   notas: string[]
 * }} HelpArticle
 */

export const HELP_SECTIONS = [
	{ id: 'comecar', title: 'Primeiros passos', icon: Sprout },
	{ id: 'encontrar', title: 'Encontrar ofertas', icon: Search },
	{ id: 'anunciar', title: 'Anunciar', icon: Megaphone },
	{ id: 'negociar', title: 'Negociar', icon: MessageSquare },
	{ id: 'operacao', title: 'Operação e avaliação', icon: Tractor },
	{ id: 'conta', title: 'Conta e segurança', icon: ShieldCheck }
];

/** @type {HelpArticle[]} */
export const HELP_ARTICLES = [
	{
		slug: 'como-funciona',
		section: 'comecar',
		title: 'Como o Osiris funciona',
		summary: 'O que dá para fazer no app: comprar, alugar, contratar e anunciar.',
		objetivo: 'Entender o caminho completo de um negócio no Osiris, do anúncio até a avaliação.',
		onde: [
			{ label: 'Início', text: 'vitrine com as ofertas mais recentes e as categorias.', href: '/' },
			{ label: 'Boas-vindas', text: 'apresentação rápida do app, em poucas telas.', href: '/boas-vindas' }
		],
		passos: [
			'Encontre uma máquina, um insumo ou um serviço pela busca ou pelas categorias do início.',
			'Abra o anúncio e toque em Negociar para enviar uma proposta ao anunciante.',
			'Converse pelo chat da negociação até chegar a um acordo.',
			'Quando o anunciante aceitar, a negociação vira uma operação, com etapas para acompanhar.',
			'No fim, as duas partes avaliam o negócio com estrelas.'
		],
		notas: [
			'Qualquer pessoa pode ver os anúncios sem entrar na conta. Para negociar ou anunciar, é preciso entrar.',
			'O Osiris não cobra pelo negócio: pagamento e entrega são combinados entre as partes.'
		]
	},
	{
		slug: 'entrar-e-perfil',
		section: 'comecar',
		title: 'Entrar na conta e editar o perfil',
		summary: 'Como entrar com o Google e atualizar nome, telefone e cidade.',
		objetivo: 'Entrar no Osiris e manter seus dados de contato atualizados.',
		onde: [
			{ label: 'Entrar', text: 'tela de login, com o botão Continuar com Google.', href: '/login' },
			{ label: 'Perfil', text: 'menu Mais → Meu perfil → Editar perfil.', href: '/mais' }
		],
		passos: [
			'Toque em Entrar (na barra de baixo do celular ou no topo do computador).',
			'Escolha Continuar com Google e selecione a sua conta.',
			'Depois de entrar, abra Mais → Meu perfil e toque em Editar perfil.',
			'Preencha o nome de exibição, o telefone e a sua cidade e toque em Salvar alterações.'
		],
		notas: [
			'A cidade do perfil já vem preenchida quando você cria um anúncio, e você pode trocá-la em cada anúncio.',
			'Para sair, use Mais → Sair da conta.'
		]
	},
	{
		slug: 'instalar-e-avisos',
		section: 'comecar',
		title: 'Instalar no celular e receber avisos',
		summary: 'Coloque o Osiris na tela inicial e ative as notificações.',
		objetivo: 'Abrir o Osiris como um aplicativo e ser avisado de propostas, mensagens e mudanças na operação.',
		onde: [
			{ label: 'Aviso de notificações', text: 'cartão Receba avisos no celular, que aparece depois que você entra.' },
			{ label: 'Sino', text: 'no topo da tela, mostra os avisos recentes.' }
		],
		passos: [
			'No Android (Chrome), abra o menu ⋮ do navegador e toque em Instalar app ou Adicionar à tela inicial.',
			'No iPhone (Safari), toque em Compartilhar e depois em Adicionar à Tela de Início.',
			'Abra o Osiris pelo ícone novo e entre na conta.',
			'No cartão Receba avisos no celular, toque em Ativar notificações e permita os avisos.'
		],
		notas: [
			'No iPhone, os avisos só funcionam com o app adicionado à tela de início.',
			'Mesmo sem notificações, o sino no topo mostra tudo o que aconteceu.'
		]
	},
	{
		slug: 'buscar-e-filtrar',
		section: 'encontrar',
		title: 'Buscar e filtrar anúncios',
		summary: 'Encontre máquinas, insumos e serviços por tipo, preço e ordem.',
		objetivo: 'Achar rápido a oferta certa, sem rolar a lista inteira.',
		onde: [
			{ label: 'Buscar', text: 'barra de baixo (celular) ou menu do topo (computador).', href: '/buscar' },
			{ label: 'Início', text: 'atalhos por categoria: máquinas, insumos e serviços.', href: '/' }
		],
		passos: [
			'Abra Buscar e escreva o que procura, por exemplo “trator” ou “semente de soja”.',
			'Toque em um tipo (Produto, Maquinário, Serviço ou Mão de obra) para ver só aquele tipo.',
			'Abra os filtros para escolher a categoria e a faixa de preço.',
			'Use a ordem para ver primeiro os mais recentes ou os de menor preço.',
			'Toque em Limpar para começar de novo.'
		],
		notas: [
			'Anúncios pausados pelo anunciante não aparecem na busca.',
			'No computador, os filtros ficam na coluna da esquerda.'
		]
	},
	{
		slug: 'favoritos',
		section: 'encontrar',
		title: 'Salvar anúncios nos favoritos',
		summary: 'Guarde ofertas para ver depois ou comparar com calma.',
		objetivo: 'Separar os anúncios que interessam e voltar a eles sem precisar buscar de novo.',
		onde: [
			{ label: 'Coração', text: 'no canto da foto de cada anúncio.' },
			{ label: 'Favoritos', text: 'menu Mais → Favoritos.', href: '/favoritos' }
		],
		passos: [
			'Toque no coração de um anúncio. Ele fica preenchido quando está salvo.',
			'Para ver a sua lista, abra Mais → Favoritos.',
			'Para tirar um anúncio da lista, toque no coração de novo.'
		],
		notas: ['É preciso estar com a conta aberta para salvar favoritos.']
	},
	{
		slug: 'anunciar-maquina',
		section: 'anunciar',
		title: 'Anunciar uma máquina',
		summary: 'Venda ou alugue por hora, dia ou hectare, com ou sem operador.',
		objetivo: 'Publicar uma máquina agrícola para venda ou aluguel em três etapas.',
		onde: [
			{ label: 'Anunciar', text: 'botão do meio na barra de baixo ou Novo anúncio no topo.', href: '/anunciar' }
		],
		passos: [
			'Escolha Máquina agrícola e toque em Próximo.',
			'Preencha o título, a descrição, o tipo, a marca, o modelo, a condição, o ano e o horímetro.',
			'Confira a cidade onde a máquina está e cole o link de uma ou mais fotos.',
			'Na etapa de preço, escolha Venda ou Aluguel. No aluguel, diga se a cobrança é por hora, por dia ou por hectare e se inclui operador.',
			'Informe o valor, escolha a forma de entrega e toque em Publicar anúncio.'
		],
		notas: [
			'Potência, tração e número de série são opcionais, mas ajudam o comprador a decidir.',
			'Só a cidade aparece no anúncio. Endereço e retirada você combina na negociação.'
		]
	},
	{
		slug: 'anunciar-insumo',
		section: 'anunciar',
		title: 'Anunciar insumos e produtos',
		summary: 'Sementes, fertilizantes, mudas, grãos, ração e peças.',
		objetivo: 'Publicar insumos ou produtos com quantidade em estoque e preço por unidade.',
		onde: [
			{ label: 'Anunciar', text: 'botão do meio na barra de baixo ou Novo anúncio no topo.', href: '/anunciar' }
		],
		passos: [
			'Escolha Insumos ou produtos e toque em Próximo.',
			'Dê um título, escolha a categoria e informe a quantidade e a unidade (sacas, kg, toneladas, litros ou unidades).',
			'Se quiser, preencha a marca, o pedido mínimo e, para sementes e grãos, a cultivar e a safra.',
			'Confira a cidade, adicione as fotos e toque em Próximo.',
			'Informe o preço por unidade e toque em Publicar anúncio.'
		],
		notas: [
			'O preço é sempre por unidade: por exemplo, R$ 310 por saca.',
			'Use o pedido mínimo para evitar propostas pequenas demais.'
		]
	},
	{
		slug: 'oferecer-servico',
		section: 'anunciar',
		title: 'Oferecer um serviço',
		summary: 'Mão de obra ou pacote completo, por hora, hectare, empreitada ou a combinar.',
		objetivo: 'Divulgar o seu trabalho, sozinho ou com máquinas e insumos inclusos.',
		onde: [
			{ label: 'Meus serviços', text: 'menu do topo no computador ou Mais → Cadastrar serviço.', href: '/servicos' },
			{ label: 'Novo serviço', text: 'botão Oferecer serviço.', href: '/servicos/novo' }
		],
		passos: [
			'Escolha Mão de obra (só a pessoa, como tratorista ou capataz) ou Pacote completo (com máquina ou insumos).',
			'Escreva o título e a descrição, confira a cidade-base e, se quiser, a área de atendimento.',
			'No pacote completo, informe o equipamento incluso e até quantos quilômetros você atende.',
			'Escolha como cobra: por hora, por hectare, empreitada (valor fechado) ou a combinar.',
			'Informe o valor e toque em Publicar serviço.'
		],
		notas: ['Em “A combinar” não é preciso informar valor: o preço sai da conversa com o cliente.']
	},
	{
		slug: 'gerenciar-anuncios',
		section: 'anunciar',
		title: 'Editar, pausar ou excluir anúncios',
		summary: 'Cuide dos seus anúncios pelo inventário e por Meus serviços.',
		objetivo: 'Manter preços e estoques em dia e tirar da vitrine o que não está disponível.',
		onde: [
			{ label: 'Meu inventário', text: 'máquinas e insumos que você anunciou.', href: '/inventario' },
			{ label: 'Meus serviços', text: 'serviços que você oferece.', href: '/servicos' }
		],
		passos: [
			'Abra Meu inventário (ou Meus serviços) e encontre o anúncio.',
			'Toque em Editar para mudar preço, quantidade, fotos ou descrição.',
			'No menu ⋮ do anúncio, use Pausar para escondê-lo da busca por um tempo e Ativar para mostrar de novo.',
			'Use Excluir só quando o anúncio não for mais voltar.'
		],
		notas: [
			'Anúncios pausados continuam salvos, mas ninguém encontra na busca.',
			'Prefira pausar a excluir: assim você não perde as fotos e as avaliações.'
		]
	},
	{
		slug: 'fazer-proposta',
		section: 'negociar',
		title: 'Fazer uma proposta e conversar',
		summary: 'Envie valor, quantidade ou datas e combine pelo chat.',
		objetivo: 'Começar uma negociação com o anunciante e combinar os detalhes pelo chat.',
		onde: [
			{ label: 'Anúncio', text: 'botão Negociar, na página do anúncio.' },
			{ label: 'Negociações', text: 'todas as conversas abertas.', href: '/negociacoes' }
		],
		passos: [
			'Abra o anúncio e toque em Negociar.',
			'Informe o valor proposto. Para insumos, diga a quantidade; para aluguel e serviços, as datas de início e fim.',
			'Toque em Enviar proposta. O anunciante recebe um aviso na hora.',
			'Acompanhe a resposta em Negociações e use o chat para tirar dúvidas e combinar a entrega.'
		],
		notas: [
			'Nas Negociações, o resumo mostra a proposta atual e quem precisa responder.',
			'Combine pagamento, frete e retirada pelo chat, para ficar tudo registrado.'
		]
	},
	{
		slug: 'responder-propostas',
		section: 'negociar',
		title: 'Responder propostas (para quem anuncia)',
		summary: 'Aceite, recuse ou ajuste o preço e as datas.',
		objetivo: 'Decidir sobre as propostas que chegam nos seus anúncios.',
		onde: [
			{ label: 'Sino', text: 'avisa quando chega uma proposta ou mensagem nova.' },
			{ label: 'Negociações', text: 'abra a conversa para ver os detalhes da proposta.', href: '/negociacoes' }
		],
		passos: [
			'Abra a negociação pelo aviso ou pela lista de Negociações.',
			'Leia a proposta e converse pelo chat se precisar de mais informações.',
			'Se quiser outro valor ou outras datas, toque em Ajustar termos nos detalhes da negociação.',
			'Toque em Aceitar para fechar o negócio ou em Recusar para encerrar a conversa.'
		],
		notas: [
			'Só quem anuncia pode aceitar, recusar ou mudar preço e datas.',
			'Ao aceitar, a negociação vira uma operação, que aparece no painel e na agenda.'
		]
	},
	{
		slug: 'acompanhar-operacao',
		section: 'operacao',
		title: 'Acompanhar a operação',
		summary: 'As etapas Aguardando, Em campo, Avaliação e Finalizada.',
		objetivo: 'Saber em que pé está o serviço, o aluguel ou a entrega depois do acordo.',
		onde: [
			{ label: 'Painel de controle', text: 'resumo das operações em andamento.', href: '/painel-de-controle' },
			{ label: 'Minha agenda', text: 'para quem anuncia: compromissos organizados por data.', href: '/painel-de-controle/agenda' }
		],
		passos: [
			'Aguardando: o acordo foi feito e o trabalho ainda não começou.',
			'Em campo: quem anuncia toca em Iniciar operação em campo quando o trabalho começa.',
			'Avaliação: ao terminar, quem anuncia toca em Encerrar operação e as duas partes avaliam.',
			'Finalizada: depois das avaliações, a operação fica guardada no histórico.'
		],
		notas: [
			'Você recebe um aviso a cada mudança de etapa.',
			'Preço, datas e participantes não mudam depois do acordo.'
		]
	},
	{
		slug: 'cancelar-operacao',
		section: 'operacao',
		title: 'Cancelar uma operação',
		summary: 'Quando dá para cancelar e por que é preciso informar o motivo.',
		objetivo: 'Desfazer um acordo que não vai acontecer, avisando a outra parte.',
		onde: [{ label: 'Operação', text: 'botão Cancelar operação, na página da operação.' }],
		passos: [
			'Abra a operação pelo painel ou pela agenda.',
			'Toque em Cancelar operação.',
			'Escolha o motivo: problema mecânico, clima, logística, indisponibilidade, desacordo comercial, desistência ou outro.',
			'Se escolher Outro motivo, explique em poucas palavras e confirme.'
		],
		notas: [
			'Só dá para cancelar enquanto a operação está Aguardando ou Em campo.',
			'A outra parte recebe um aviso com o motivo do cancelamento.'
		]
	},
	{
		slug: 'avaliacoes',
		section: 'operacao',
		title: 'Avaliar e ver avaliações',
		summary: 'Dê estrelas no fim do negócio e confira a reputação de quem anuncia.',
		objetivo: 'Ajudar a comunidade a escolher com quem negociar.',
		onde: [
			{ label: 'Operação', text: 'na etapa Avaliação, aparece o campo de estrelas.' },
			{ label: 'Anúncio e perfil', text: 'mostram as notas e os comentários recebidos.' }
		],
		passos: [
			'Quando a operação chegar em Avaliação, abra a página dela.',
			'Escolha de 1 a 5 estrelas e, se quiser, escreva um comentário.',
			'Toque em Enviar avaliação.'
		],
		notas: [
			'O app manda lembretes enquanto a avaliação estiver pendente.',
			'Antes de negociar, veja as avaliações no anúncio e no perfil do anunciante.'
		]
	},
	{
		slug: 'painel-e-agenda',
		section: 'conta',
		title: 'Painel de controle e agenda',
		summary: 'Resumo dos seus anúncios, negociações e compromissos.',
		objetivo: 'Ver, em uma tela só, o que precisa da sua atenção.',
		onde: [
			{ label: 'Painel', text: 'Mais → Painel de controle.', href: '/painel-de-controle' },
			{ label: 'Agenda', text: 'dentro do painel, em Minha agenda.', href: '/painel-de-controle/agenda' }
		],
		passos: [
			'Abra o Painel de controle para ver números dos anúncios e das negociações.',
			'Toque em um item do resumo para ir direto à tela dele.',
			'Se você aluga máquinas ou presta serviços, abra Minha agenda para ver os dias ocupados e não marcar dois trabalhos na mesma data.'
		],
		notas: ['A agenda mostra as operações fechadas e também as propostas em conversa que já têm datas.']
	},
	{
		slug: 'seguranca-e-privacidade',
		section: 'conta',
		title: 'Segurança e privacidade',
		summary: 'O que os outros veem de você e dicas para negociar com segurança.',
		objetivo: 'Negociar com tranquilidade, sabendo quais dados ficam visíveis.',
		onde: [
			{ label: 'Privacidade', text: 'política completa de privacidade.', href: '/privacidade' },
			{ label: 'Termos de uso', text: 'regras de uso do Osiris.', href: '/termos' }
		],
		passos: [
			'Os outros usuários veem o seu nome, a foto e a cidade dos anúncios.',
			'E-mail, telefone e CPF não aparecem para ninguém no app.',
			'Combine tudo pelo chat da negociação, para ficar registrado.',
			'Desconfie de pedidos de pagamento antecipado fora do combinado.'
		],
		notas: ['Viu algo estranho? Escreva para o contato da equipe, no fim desta página.']
	}
];

/** @param {string} slug */
export function findHelpArticle(slug) {
	return HELP_ARTICLES.find((article) => article.slug === slug) ?? null;
}

/** @param {string} sectionId */
export function findHelpSection(sectionId) {
	return HELP_SECTIONS.find((section) => section.id === sectionId) ?? null;
}

/** @param {string} sectionId */
export function helpArticlesIn(sectionId) {
	return HELP_ARTICLES.filter((article) => article.section === sectionId);
}

/** @param {string} value */
function normalize(value) {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/** @param {HelpArticle} article */
function articleSentences(article) {
	return [
		article.objetivo,
		...article.onde.map((place) => `${place.label}: ${place.text}`),
		...article.passos,
		...article.notas
	];
}

/**
 * Busca sem acento nem maiúsculas no título, resumo e corpo dos artigos.
 * Título e resumo pesam mais. Quando o termo só aparece no corpo, o trecho
 * mostrado é a frase (passo ou observação) onde ele aparece.
 * @param {string} query
 */
export function searchHelp(query) {
	const terms = normalize(query).split(/\s+/).filter((term) => term.length > 1);
	if (!terms.length) return [];

	return HELP_ARTICLES.map((article) => {
		const head = normalize(`${article.title} ${article.summary}`);
		const sentences = articleSentences(article);
		const body = normalize(sentences.join(' '));
		if (!terms.every((term) => head.includes(term) || body.includes(term))) return null;

		const score = terms.reduce((total, term) => total + (head.includes(term) ? 3 : 1), 0);
		const inHead = terms.some((term) => head.includes(term));
		const excerpt = inHead
			? article.summary
			: (sentences.find((sentence) => terms.some((term) => normalize(sentence).includes(term))) ?? article.summary);
		return { article, score, excerpt };
	})
		.filter((result) => result !== null)
		.sort((a, b) => b.score - a.score);
}
