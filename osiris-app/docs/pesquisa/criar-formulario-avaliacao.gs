/**
 * Cria no Google Forms o formulário de avaliação da demonstração do Osiris.
 *
 * Como usar:
 *  1. Preencha CONFIG (projeto, responsável, contato) e UEQ_S (abaixo) com os pares de adjetivos da
 *     versão OFICIAL em português do UEQ-S (https://www.ueq-online.org), na mesma ordem e com os
 *     mesmos lados (esquerda = valor 1, direita = valor 7). A planilha oficial de análise do UEQ-S
 *     espera exatamente essa ordem e polaridade.
 *  2. Em https://script.google.com, crie um projeto, cole este arquivo e execute criarFormulario.
 *  3. Autorize o acesso quando o Google pedir. Os links aparecem no Registro de execução.
 *
 * Rodar de novo cria um formulário novo (não altera o anterior).
 */

const CONFIG = {
  titulo: 'Avaliação do Osiris',
  projeto: '[NOME DO PROJETO / TRABALHO]',
  responsavel: '[NOME DO RESPONSÁVEL]',
  contato: '[E-MAIL DE CONTATO]'
};

// [lado esquerdo (1), lado direito (7)] — copie os 8 pares do material oficial do UEQ-S em português.
const UEQ_S = [
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER'],
  ['PREENCHER', 'PREENCHER']
];

const CONCORDANCIA = ['Discordo totalmente', 'Concordo totalmente'];

function criarFormulario() {
  validarConfiguracao();

  const form = FormApp.create(CONFIG.titulo);
  form
    .setDescription(
      'Obrigado por assistir à demonstração do Osiris, um aplicativo para anunciar, negociar e contratar ' +
        'máquinas, insumos e serviços do agro. Leva cerca de 5 minutos. Não existem respostas certas ou erradas.'
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false) // exigiria login no Google, o que afasta parte dos produtores
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setProgressBar(true)
    .setConfirmationMessage('Respostas enviadas. Muito obrigado pela sua contribuição!');

  // 1. Consentimento
  const consentimento = form
    .addMultipleChoiceItem()
    .setTitle('Termo de consentimento')
    .setHelpText(
      'Esta pesquisa faz parte do trabalho "' + CONFIG.projeto + '", sob responsabilidade de ' +
        CONFIG.responsavel + '. Ela avalia a primeira impressão sobre o aplicativo Osiris. ' +
        'A participação é voluntária e anônima: não pedimos nome, e-mail, CPF ou telefone, e você pode ' +
        'desistir a qualquer momento sem enviar o formulário. As respostas serão usadas apenas de forma ' +
        'agrupada, para fins acadêmicos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). ' +
        'Dúvidas: ' + CONFIG.contato + '.'
    )
    .setRequired(true);
  consentimento.setChoices([
    consentimento.createChoice('Li e concordo em participar', FormApp.PageNavigationType.CONTINUE),
    consentimento.createChoice('Não quero participar', FormApp.PageNavigationType.SUBMIT)
  ]);

  // 2. Perfil
  form.addPageBreakItem().setTitle('Sobre você');
  form
    .addMultipleChoiceItem()
    .setTitle('Que papel você teria no Osiris?')
    .setChoiceValues([
      'Produtor que contrata máquinas ou serviços',
      'Tenho máquinas ou produtos para alugar ou vender',
      'Presto serviços (operador, mão de obra, pacote completo)',
      'Não usaria, estou só avaliando'
    ])
    .showOtherOption(true)
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Qual a sua relação com o agro?')
    .setChoiceValues([
      'Trabalho no campo',
      'Minha família trabalha no campo',
      'Trabalho na área técnica ou comercial do agro',
      'Não tenho relação com o agro'
    ])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Com que frequência você usa o celular para comprar ou contratar algo?')
    .setChoiceValues(['Toda semana', 'Algumas vezes por mês', 'Raramente', 'Nunca'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Qual a sua faixa de idade?')
    .setChoiceValues(['Até 24 anos', '25 a 39 anos', '40 a 59 anos', '60 anos ou mais'])
    .setRequired(true);

  // 3. UEQ-S
  form
    .addPageBreakItem()
    .setTitle('Sua impressão do aplicativo')
    .setHelpText(
      'Pelo que você viu na demonstração, marque em cada linha o ponto que melhor descreve o Osiris. ' +
        'Quanto mais perto de uma palavra, mais ela descreve o aplicativo. Responda rápido, pela primeira impressão.'
    );
  UEQ_S.forEach(function (par) {
    form
      .addScaleItem()
      .setTitle(par[0] + ' — ' + par[1])
      .setBounds(1, 7)
      .setLabels(par[0], par[1])
      .setRequired(true);
  });

  // 4. Perguntas do Osiris
  form
    .addPageBreakItem()
    .setTitle('Sobre o Osiris')
    .setHelpText('Diga o quanto você concorda com cada frase, pelo que viu na demonstração.');
  [
    'Entendi como anunciar uma máquina, um produto ou um serviço.',
    'O jeito de negociar pelo app (proposta e conversa) combina com o jeito que eu negocio hoje.',
    'Acompanhar a operação pelo app (início, andamento e fim) seria útil para mim.',
    'Eu confiaria em contratar alguém pelas avaliações de outros usuários.',
    'Eu me sentiria seguro em informar meu CPF e telefone no app.',
    'Eu usaria o Osiris no meu dia a dia.'
  ].forEach(function (frase) {
    form
      .addScaleItem()
      .setTitle(frase)
      .setBounds(1, 5)
      .setLabels(CONCORDANCIA[0], CONCORDANCIA[1])
      .setRequired(true);
  });
  form
    .addCheckboxItem()
    .setTitle('O que você achou mais útil? (pode marcar mais de uma)')
    .setChoiceValues([
      'Encontrar máquinas, produtos ou serviços',
      'Anunciar o que eu tenho',
      'Negociar pela conversa no app',
      'Acompanhar a operação',
      'Ver as avaliações de outros usuários',
      'Receber avisos no celular'
    ])
    .setRequired(false);
  form
    .addCheckboxItem()
    .setTitle('Sentiu falta de alguma coisa? (pode marcar mais de uma)')
    .setChoiceValues([
      'Pagar pelo app',
      'Contrato em PDF',
      'Mapa com a localização dos anúncios',
      'Avisos pelo WhatsApp',
      'Usar sem internet'
    ])
    .showOtherOption(true)
    .setRequired(false);
  form
    .addScaleItem()
    .setTitle('De 0 a 10, quanto você recomendaria o Osiris para alguém do agro?')
    .setBounds(0, 10)
    .setLabels('Não recomendaria', 'Recomendaria com certeza')
    .setRequired(true);

  // 5. Comentários
  form.addPageBreakItem().setTitle('Comentários (opcional)');
  form.addParagraphTextItem().setTitle('O que você mais gostou?').setRequired(false);
  form.addParagraphTextItem().setTitle('O que você mudaria primeiro?').setRequired(false);

  const planilha = SpreadsheetApp.create(CONFIG.titulo + ' (respostas)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  Logger.log('Link para responder (use no QR code): ' + form.getPublishedUrl());
  Logger.log('Link para editar: ' + form.getEditUrl());
  Logger.log('Planilha de respostas: ' + planilha.getUrl());
}

function validarConfiguracao() {
  const pendentes = [];
  Object.keys(CONFIG).forEach(function (chave) {
    if (String(CONFIG[chave]).indexOf('[') === 0) pendentes.push('CONFIG.' + chave);
  });
  UEQ_S.forEach(function (par, i) {
    if (par.length !== 2 || par.indexOf('PREENCHER') !== -1) pendentes.push('UEQ_S, par ' + (i + 1));
  });
  if (UEQ_S.length !== 8) pendentes.push('UEQ_S precisa ter 8 pares');
  if (pendentes.length) {
    throw new Error('Preencha antes de executar: ' + pendentes.join(', '));
  }
}
