# Plano de testes — Osiris

**Versão:** 1.0  
**Data de referência:** 05/08/2026  
**Status:** Automação E2E em andamento; 32 cenários executáveis no Playwright.

## 1. Objetivo

Este documento consolida os testes funcionais, de integração, segurança e E2E do Osiris. O foco inicial é garantir os fluxos críticos de um marketplace com dois participantes — comprador e vendedor — especialmente publicação, negociação, operação, cancelamento, avaliação, chat e notificações em tempo real.

## 2. Escopo e premissas

- O mesmo usuário pode anunciar e contratar.
- O login apresentado ao usuário é exclusivamente Google OAuth.
- E-mail e senha serão habilitados somente no projeto Supabase de desenvolvimento para autenticação técnica dos testes E2E.
- Pagamentos acontecem integralmente fora do Osiris.
- Não há bloqueio automático de calendário. Ao aceitar uma negociação, o vendedor assume a responsabilidade pela disponibilidade.
- Os testes automatizados serão executados inicialmente no ambiente de desenvolvimento.
- A ferramenta E2E adotada será Playwright.
- Google OAuth real será validado manualmente; os demais fluxos usarão sessões técnicas do Supabase.

## 3. Estados oficiais

### 3.1 Negociação

```text
solicitada → em_negociacao → aceita
                          ↘ recusada

solicitada ───────────────→ cancelado
em_negociacao ────────────→ cancelado
```

- `solicitada` e `em_negociacao` são estados distintos e não devem ser agrupados sob o rótulo genérico “Pendente” nos testes.
- Uma negociação aceita cria exatamente uma operação com estado inicial `pendente`.
- Negociações canceladas antes do aceite não permitem avaliação.
- O chat aceita novas mensagens apenas em `solicitada` e `em_negociacao`.

### 3.2 Operação

```text
pendente → em_operacao → em_avaliacao → finalizada
    ↘ cancelado     ↘ cancelado
```

- Uma operação só existe após o aceite de uma negociação.
- Qualquer operação cancelada permanece definitivamente em `cancelado`, mesmo depois das avaliações.
- Como a negociação já havia sido aceita, o cancelamento da operação libera avaliação imediata para os dois participantes.

## 4. Modelo de cancelamento

### 4.1 Campos esperados

| Campo | Regra |
|---|---|
| `status` | Deve receber `cancelado`. |
| `cancellation_reason` | Código obrigatório pertencente à lista oficial. |
| `cancellation_reason_details` | Obrigatório somente quando o código for `other`. |
| `cancelled_by` | UUID obrigatório do cliente ou prestador da operação. |
| `cancelled_at` | Horário do servidor em que o cancelamento foi confirmado. |

### 4.2 Motivos oficiais

| Código persistido | Texto apresentado |
|---|---|
| `mechanical_issue` | Problema mecânico |
| `weather_conditions` | Condições climáticas |
| `logistical_issue` | Falha logística / Transporte |
| `operational_unavailability` | Indisponibilidade operacional |
| `commercial_disagreement` | Desacordo comercial |
| `withdrawal` | Desistência |
| `other` | Outro |

Quando `other` for selecionado, a interface deve exibir um `textarea`. Depois de aplicado `trim`, o texto deve possuir pelo menos 15 caracteres.

## 5. Legenda do catálogo

- **P0:** fluxo crítico ou controle de segurança.
- **P1:** importante para confiabilidade e experiência.
- **P2:** cobertura complementar.
- **Manual:** depende de interação humana ou provedor externo.
- **E2E:** cenário automatizável pela interface com Playwright.
- **Integração:** valida interação entre aplicação, Supabase, funções ou jobs.
- **Banco/RLS:** valida constraint, função, atomicidade ou política de acesso.
- **Novo requisito:** o comportamento ainda não está integralmente representado na implementação atual.

## 6. Catálogo de casos

### 6.1 Autenticação

#### AUTH-01 — Login com Google

- **Prioridade:** P0
- **Tipo:** Manual
- **Pré-condição:** usuário sem sessão ativa.
- **Passos:** abrir `/login`, iniciar o login Google e autorizar o acesso.
- **Resultado esperado:** sessão criada, perfil correto carregado e redirecionamento concluído.

#### AUTH-02 — Cancelamento ou falha do OAuth

- **Prioridade:** P1
- **Tipo:** Manual
- **Resultado esperado:** nenhuma sessão criada, aplicação permanece utilizável e erro compreensível é apresentado.

#### AUTH-03 — Redirecionamento após autenticação

- **Prioridade:** P0
- **Tipo:** E2E
- **Passos:** sem sessão, tentar favoritar ou negociar; autenticar tecnicamente; retomar o fluxo.
- **Resultado esperado:** retorno à página original. Caminhos externos, inclusive iniciados por `//`, são rejeitados.

#### AUTH-04 — Logout

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** sessão removida, dados privados ocultados e rotas protegidas redirecionadas ao login.

### 6.2 Publicação de anúncios

#### PUB-MAQ-01 — Publicar maquinário

- **Prioridade:** P0
- **Tipo:** E2E
- **Pré-condição:** vendedor autenticado.
- **Resultado esperado:** produto, especialização de maquinário e imagens associados corretamente; anúncio presente no inventário e marketplace.

#### PUB-INS-01 — Publicar insumo/produto

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** produto publicado sem registro indevido de maquinário e disponível na categoria e nos filtros corretos.

#### PUB-SERV-01 — Publicar serviço

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** serviço criado com proprietário e status corretos, visível na listagem e na busca.

#### PUB-ERR-01 — Falha parcial de publicação

- **Prioridade:** P0
- **Tipo:** Integração
- **Resultado esperado:** nenhum produto, especialização ou imagem órfã permanece após uma falha intermediária.

### 6.3 Inventário

#### INV-01 — Listar somente anúncios do proprietário

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Resultado esperado:** o usuário visualiza e gerencia somente os próprios registros.

#### INV-02 — Editar anúncio

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** dados, imagens e capa são persistidos e refletidos no marketplace.

#### INV-03 — Pausar e reativar

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** status atualizado e visibilidade pública coerente.

#### INV-04 — Excluir anúncio com dependências

- **Prioridade:** P0
- **Tipo:** Integração
- **Resultado esperado:** exclusão controlada, sem registros órfãos e sem remover dados de outros usuários.

### 6.4 Busca, filtros e favoritos

#### BUS-01 — Buscar por texto

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** resultados relevantes, estados vazio/erro corretos e ausência de itens inativos.

#### BUS-02 — Combinar filtros

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** categoria, tipo, preço, localização e demais filtros são combinados sem perda indevida de resultados.

#### FAV-01 — Adicionar e remover favorito

- **Prioridade:** P1
- **Tipo:** E2E
- **Resultado esperado:** ação persistida, sem duplicidade, e refletida após recarregar.

#### FAV-02 — Favoritar sem autenticação

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** redirecionamento seguro ao login e retorno ao anúncio.

### 6.5 Negociações

#### NEG-01 — Criar proposta

- **Prioridade:** P0
- **Tipo:** E2E com dois contextos
- **Resultado esperado:** negociação `solicitada`, mensagem inicial persistida e notificação em tempo real para o prestador.

#### NEG-02 — Impedir negociação no próprio anúncio

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Resultado esperado:** bloqueio na aplicação e rejeição de inserção direta.

#### NEG-03 — Criar contraproposta

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** estado `em_negociacao`, termos atualizados, cliente notificado e chat habilitado.

#### NEG-04 — Aceitar proposta atomicamente

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Resultado esperado:** negociação `aceita`, exatamente uma operação `pendente`, redirecionamento para `/operacoes/{id}`, notificação ao cliente e chat somente para leitura.

#### NEG-05 — Impedir aceite duplicado

- **Prioridade:** P0
- **Tipo:** Integração
- **Resultado esperado:** duas solicitações concorrentes produzem somente uma operação e uma notificação de aceite.

#### NEG-06 — Recusar proposta

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** negociação `recusada`, nenhuma operação criada, cliente notificado e chat somente para leitura.

#### NEG-07 — Cancelar em `solicitada`

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Classificação:** Novo requisito
- **Resultado esperado:** qualquer participante pode cancelar; estado `cancelado`; nenhuma operação ou avaliação; chat somente para leitura.

#### NEG-08 — Cancelar em `em_negociacao`

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Classificação:** Novo requisito
- **Resultado esperado:** mesmos controles de NEG-07, preservando o histórico da contraproposta.

### 6.6 Cancelamento da operação

#### CAN-01 — Cancelar com motivo predefinido

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Classificação:** Novo requisito
- **Resultado esperado:** status, código, autor e data persistidos; detalhes permanecem nulos.

#### CAN-02 — Cancelar usando “Outro”

- **Prioridade:** P0
- **Tipo:** E2E
- **Classificação:** Novo requisito
- **Resultado esperado:** `textarea` exibido e código/detalhes persistidos separadamente.

#### CAN-03 — Validar detalhes de “Outro”

- **Prioridade:** P0
- **Tipo:** E2E + Banco
- **Classificação:** Novo requisito
- **Resultado esperado:** vazio, espaços ou texto com menos de 15 caracteres após `trim` são rejeitados.

#### CAN-04 — Exibir motivo à contraparte

- **Prioridade:** P0
- **Tipo:** E2E
- **Classificação:** Novo requisito
- **Resultado esperado:** contraparte visualiza motivo traduzido, detalhes, autor e data.

#### CAN-05 — Liberar avaliação imediatamente

- **Prioridade:** P0
- **Tipo:** E2E
- **Classificação:** Novo requisito
- **Resultado esperado:** cliente e prestador podem avaliar uma operação cancelada, inclusive quando o estado anterior era `pendente`.

#### CAN-06 — Preservar `cancelado` após avaliações

- **Prioridade:** P0
- **Tipo:** E2E + Banco
- **Classificação:** Novo requisito
- **Resultado esperado:** duas avaliações registradas, operação ainda `cancelado` e UI reconhecendo a conclusão pelas avaliações existentes.

#### CAN-07 — Rejeitar cancelamento inválido

- **Prioridade:** P0
- **Tipo:** Banco/RLS
- **Classificação:** Novo requisito
- **Resultado esperado:** terceiro, repetição, código desconhecido, autor nulo e `other` inválido são rejeitados.

### 6.7 Avaliações

#### AVL-01 — Registrar uma avaliação por participante

- **Prioridade:** P0
- **Tipo:** E2E + Banco
- **Resultado esperado:** cada parte avalia a contraparte uma única vez; autoavaliação e duplicidade são rejeitadas.

#### AVL-02 — Calcular reputação

- **Prioridade:** P1
- **Tipo:** Integração
- **Resultado esperado:** média e quantidade de avaliações correspondem aos registros válidos.

#### AVL-03 — Finalizar operação normal após avaliações

- **Prioridade:** P0
- **Tipo:** E2E
- **Resultado esperado:** operação em `em_avaliacao` pode chegar a `finalizada` conforme o fluxo normal, sem afetar a regra especial de operações canceladas.

### 6.8 Chat em tempo real

#### CHAT-01 — Receber mensagem sem recarregar

- **Prioridade:** P0
- **Tipo:** E2E com dois contextos
- **Automação:** Implementada em `tests/e2e/chat-notifications.spec.js`; a persistência é estável, mas a entrega do evento no chat está registrada como falha esperada condicional enquanto permanecer intermitente.
- **Resultado esperado:** mensagem aparece para a contraparte em ordem cronológica e sem duplicação.

#### CHAT-02 — Bloquear chat encerrado

- **Prioridade:** P0
- **Tipo:** E2E + Banco/RLS
- **Automação:** Implementada em `tests/e2e/chat-notifications.spec.js`.
- **Resultado esperado:** em `aceita`, `recusada` ou `cancelado`, o campo é substituído por “Chat encerrado para esta negociação.” e inserções diretas são rejeitadas.

#### CHAT-03 — Isolar participantes

- **Prioridade:** P0
- **Tipo:** Banco/RLS
- **Automação:** Implementada em `tests/e2e/chat-notifications.spec.js`.
- **Resultado esperado:** terceiros não leem nem inserem mensagens e participantes não acessam conversas de outras negociações.

### 6.9 Notificações

#### NOT-01 — Notificar nova proposta

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Resultado esperado:** prestador recebe notificação em tempo real e link correto.

#### NOT-02 — Notificar contraproposta, aceite e recusa

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Resultado esperado:** destinatário, texto, link, estado de leitura e ausência de duplicidade corretos.

#### NOT-03 — Agrupar mensagens não lidas

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Classificação:** Novo requisito
- **Automação:** Implementada em `tests/e2e/chat-notifications.spec.js`.
- **Resultado esperado:** primeira mensagem cria o alerta; mensagens seguintes fazem upsert no mesmo alerta não lido e renovam `updated_at`.

#### NOT-04 — Criar novo alerta após leitura

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Automação:** Implementada em `tests/e2e/chat-notifications.spec.js`.
- **Resultado esperado:** depois da leitura, uma nova mensagem cria outro registro. Negociações diferentes nunca são agrupadas.

#### NOT-05 — Notificação combinada de cancelamento

- **Prioridade:** P0
- **Tipo:** E2E + Integração
- **Classificação:** Novo requisito
- **Resultado esperado:** contraparte recebe exatamente uma notificação com o texto:

> Sua operação foi cancelada. Clique aqui para ver o motivo e avaliar sua experiência com este usuário.

### 6.10 Notificação agendada de avaliação

#### AGD-01 — Não notificar antes do prazo

- **Prioridade:** P1
- **Tipo:** Integração
- **Automação:** Implementada em `tests/e2e/scheduled-review-reminders.spec.js`.
- **Resultado esperado:** nenhuma solicitação antes de `término previsto + 24 horas`.

#### AGD-02 — Notificar após 24 horas

- **Prioridade:** P1
- **Tipo:** Integração
- **Classificação:** Novo requisito
- **Automação:** Implementada em `tests/e2e/scheduled-review-reminders.spec.js` por invocação determinística da função; o disparador cron deve ser validado separadamente no ambiente que o executa.
- **Resultado esperado:** participantes que ainda não avaliaram recebem a solicitação exatamente a partir do prazo.

#### AGD-03 — Garantir idempotência

- **Prioridade:** P0
- **Tipo:** Integração
- **Automação:** Implementada em `tests/e2e/scheduled-review-reminders.spec.js`.
- **Resultado esperado:** execuções repetidas do job não duplicam notificações e não notificam quem já avaliou.

#### AGD-04 — Evitar redundância após cancelamento

- **Prioridade:** P1
- **Tipo:** Integração
- **Automação:** Implementada em `tests/e2e/scheduled-review-reminders.spec.js`.
- **Resultado esperado:** operação cancelada recebe a notificação combinada imediata e não recebe depois uma segunda solicitação redundante.

### 6.11 Responsividade, acessibilidade e estados visuais

#### UI-01 — Responsividade mobile

- **Prioridade:** P0
- **Tipo:** E2E visual/funcional
- **Automação:** Implementada em `tests/e2e/interface-accessibility.spec.js` com viewport de 320 px.
- **Resultado esperado:** navegação inferior, formulários, modais, filtros e listagens utilizáveis a partir de 320 px.

#### UI-02 — Responsividade tablet e desktop

- **Prioridade:** P1
- **Tipo:** E2E visual/funcional
- **Automação:** Implementada em `tests/e2e/interface-accessibility.spec.js` com viewports de tablet e desktop.
- **Resultado esperado:** conteúdo aproveita a largura disponível, drawer desktop funciona e não há overflow horizontal.

#### UI-03 — Navegação por teclado

- **Prioridade:** P1
- **Tipo:** E2E
- **Automação:** Implementada em `tests/e2e/interface-accessibility.spec.js`.
- **Resultado esperado:** foco visível, ordem lógica, fechamento por `Escape` e contenção de foco em diálogos.

#### UI-04 — Loading, vazio e erro

- **Prioridade:** P1
- **Tipo:** E2E
- **Automação:** Implementada em `tests/e2e/interface-accessibility.spec.js` por interceptação controlada das respostas do marketplace.
- **Resultado esperado:** skeletons durante carregamento, estados vazios informativos, tentativa novamente quando aplicável e ausência de conteúdo obsoleto após erro.

## 7. Matriz de notificações obrigatórias

| Evento | Prioridade | Comportamento |
|---|---:|---|
| Nova proposta | P0 | Criar notificação para o prestador. |
| Contraproposta | P0 | Criar notificação para o cliente. |
| Proposta aceita | P0 | Criar notificação para o cliente. |
| Proposta recusada | P0 | Criar notificação para o cliente. |
| Nova mensagem | P1 | Fazer upsert de uma notificação genérica não lida. |
| Operação iniciada | P1 | Notificar a contraparte. |
| Operação cancelada | P0 | Enviar uma notificação combinada com avaliação. |
| Solicitação de avaliação | P1 | Enviar 24 horas após o término previsto. |

## 8. Estratégia Playwright

### 8.1 Usuários técnicos

- `comprador-e2e@teste.com`
- `vendedor-e2e@teste.com`

Os usuários serão autenticados por `supabase.auth.signInWithPassword(...)` no setup. As sessões serão persistidas em arquivos `storageState` independentes. A interface de login continuará mostrando somente Google.

### 8.2 Dois atores simultâneos

Os testes de negociação e tempo real devem abrir dois contextos isolados do navegador. Cookies, local storage e sessão não podem ser compartilhados entre comprador e vendedor.

### 8.3 Massa de dados

- Usar `[E2E]` nos nomes e títulos criados.
- Registrar os IDs de todos os registros gerados.
- Não reutilizar anúncios reais.
- Não executar limpeza ampla por `LIKE` como mecanismo principal.
- Restringir setup e teardown aos usuários técnicos.

### 8.4 Teardown

Excluir somente IDs registrados pela execução e respeitar a ordem das dependências, incluindo, quando aplicável:

1. avaliações;
2. mensagens;
3. notificações;
4. favoritos;
5. operações;
6. negociações;
7. imagens e especializações;
8. produtos e serviços.

A chave `service_role` deve ser utilizada apenas no processo Node de setup/teardown e nunca enviada ao navegador.

### 8.5 Testes temporais

Alterar o relógio do navegador não altera o relógio do Supabase ou do `pg_cron`. Para testar o prazo de 24 horas, deve-se:

- criar dados com término retroativo; ou
- invocar diretamente uma função agendada parametrizável em ambiente de teste.

## 9. Requisitos atualmente pendentes

Os seguintes testes devem inicialmente falhar ou permanecer marcados como bloqueados até a implementação correspondente:

1. Cancelamento de negociação em `solicitada` ou `em_negociacao`.
2. Campos estruturados de cancelamento da operação.
3. Validação condicional de “Outro”.
4. Avaliação imediata de operação `cancelado`.
5. Permanência em `cancelado` após duas avaliações.
6. Notificação combinada de cancelamento.
7. Upsert de notificações de mensagens não lidas.
8. Solicitação agendada de avaliação após 24 horas.
9. Políticas RLS que rejeitem mensagens depois do encerramento da negociação.

## 10. Ordem de implementação e automação

1. Criar constraints, campos, funções e políticas RLS pendentes.
2. Adequar UI e regras de cancelamento/avaliação.
3. Configurar Playwright e autenticação técnica.
4. Criar fixtures, registro de IDs e teardown seguro.
5. Automatizar publicação dos três domínios.
6. Automatizar proposta, contraproposta, aceite e recusa.
7. Automatizar cancelamento e avaliação.
8. Automatizar chat com dois contextos.
9. Automatizar notificações e concorrência.
10. Automatizar job de avaliação com datas controladas.

## 11. Critérios de entrada e saída

### Entrada

- Ambiente de desenvolvimento disponível.
- Dois usuários E2E criados.
- Dados de referência mínimos disponíveis.
- Requisitos de banco do cenário implementados.

### Saída para P0

- Todos os casos P0 aprovados.
- Nenhuma violação conhecida de RLS.
- Nenhuma duplicação de operação, avaliação ou notificação crítica.
- Teardown executado sem atingir dados externos à execução.
- Evidências de falha disponíveis no Playwright, incluindo trace e screenshot.

## 12. Rastreabilidade com o backlog existente

| Item existente | Cobertura neste plano |
|---|---|
| O20-53 — Teste de autenticação | AUTH-01 a AUTH-04 |
| O20-57 — Fluxo completo do anunciante | PUB-MAQ-01, PUB-INS-01, PUB-SERV-01 e inventário |
| O20-54 — Publicação de anúncio | PUB-MAQ-01, PUB-INS-01, PUB-SERV-01 e PUB-ERR-01 |
| O20-55 — Inventário | INV-01 a INV-04 |
| O20-56 — Busca e filtros | BUS-01 e BUS-02 |
| O20-58 — Testes mobile responsivos | UI-01 a UI-04 |
| O20-90 — Revisar queries | Casos de integração, Banco/RLS, atomicidade e teardown |
