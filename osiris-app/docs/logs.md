# Logs de uso e de erros

O app grava **eventos de uso** (o que as pessoas fazem) e **erros** (o que falha na tela delas) na
tabela `public.app_events` do Supabase. Serve para analisar os testes com usuários e encontrar
problemas sem depender de alguém avisar.

- **Código:** `src/lib/telemetry.js` (funções `track`, `trackError`, `trackPageView`); ligado em
  `src/routes/+layout.svelte` e `src/hooks.client.js`.
- **Banco:** `supabase/migrations/20261020120000_logs_de_uso_e_erros.sql`.
- O app **só insere**; pela API ninguém lê nem apaga. A leitura é feita no painel do Supabase
  (SQL Editor), de preferência pelas views do schema `analytics`.

## O que é registrado

Cada linha tem: data e hora, `kind` (`event` ou `error`), `name`, a página (`path`) e a rota
agrupada (`route`, ex.: `/anuncio/[tipo]/[id]`), um id de **sessão** (por aba do navegador), o
usuário (só se logado; vem do token, o app não consegue informar outro) e `props` com detalhes.

`env` separa produção (`prod`, osiris-agro.vercel.app), previews da Vercel (`preview`) e o
desenvolvimento local (`dev`). As views só olham `prod`.

**Não é registrado:** e-mail, telefone, CPF, texto das mensagens do chat, descrição dos anúncios
ou qualquer coisa digitada nos formulários. Em mensagens de erro, e-mails e números longos são
trocados por `[email]` e `[número]` antes de gravar.

### Eventos

| Evento | Quando | Detalhes (`props`) |
|---|---|---|
| `page_view` | abriu uma tela | `navegacao` (enter, link, popstate…) |
| `busca` | buscou um termo (2+ letras) | `termo`, `resultados` |
| `login_iniciado` | tocou em "Continuar com Google" | `provedor`, `com_destino` |
| `apresentacao_concluida` | saiu da apresentação do primeiro acesso | `ultimo_slide`, `pulou` |
| `notificacoes_ativadas` / `notificacoes_falharam` | tocou em "Ativar notificações" | `permissao`, `motivo`, `brave` |
| `notificacoes_dispensadas` | fechou o aviso de notificações | |
| `anuncio_iniciado` | abriu o formulário de anúncio | |
| `anuncio_etapa` | avançou de etapa | `etapa` (1 = Detalhes, 2 = Preço), `categoria` |
| `anuncio_publicado` | publicou máquina ou insumo | `categoria`, `negocio`, `cobranca` |
| `servico_iniciado` / `servico_etapa` / `servico_publicado` | o mesmo para serviços | `etapa`, `tipo`, `cobranca` |
| `favorito_adicionado` / `favorito_removido` | tocou no coração | |
| `proposta_enviada` | enviou uma proposta | `alvo` (produto/servico), `com_datas` |
| `mensagem_enviada` | mandou mensagem no chat (sem o texto) | `prestador` |
| `proposta_alterada` / `proposta_aceita` / `proposta_recusada` | anunciante respondeu | |
| `operacao_iniciada` / `operacao_encerrada` / `operacao_finalizada` | mudou o status da operação | `status` |
| `avaliacao_enviada` | avaliou a outra parte | `nota`, `com_comentario` |
| `operacao_cancelada` | cancelou a operação | `motivo` |

### Erros (`kind = 'error'`)

| Nome | Origem |
|---|---|
| `js_error` | exceção de JavaScript não tratada |
| `promise_rejeitada` | promessa rejeitada sem tratamento |
| `erro_de_pagina` | erro ao carregar uma página (o que leva à tela de erro) |
| `console` | qualquer `console.error` do app (as telas já avisam falhas assim) |
| `anuncio_falhou`, `servico_falhou`, `proposta_falhou`, `proposta_*_falhou`, `operacao_status_falhou`, `avaliacao_falhou`, `cancelamento_falhou` | falha ao salvar, com `message` e `code` do Supabase |

Erros iguais em menos de 10 s viram um registro só, e cada sessão grava no máximo 50 erros.

## Consultas prontas (schema `analytics`)

No SQL Editor do Supabase:

```sql
select * from analytics.uso_por_dia;            -- sessões, usuários, páginas e erros por dia
select * from analytics.erros_frequentes;       -- erros dos últimos 30 dias, do mais comum ao menos
select * from analytics.funil_anuncio;          -- iniciaram > chegaram em Detalhes > Preço > publicaram
select * from analytics.funil_negociacao;       -- propostas, aceites, operações, avaliações
select * from analytics.eventos order by created_at desc limit 200;  -- eventos crus (usuário apelidado)
```

Passo a passo de um participante (pegue o `session_id` em `analytics.eventos`):

```sql
select horario_brasilia, kind, name, route, props, desde_o_anterior
from analytics.jornadas
where session_id = '<id da sessão>'
order by horario_brasilia;
```

Outras perguntas comuns:

```sql
-- telas mais vistas
select route, count(*) vezes, count(distinct session_id) sessoes
from analytics.eventos where name = 'page_view'
group by route order by vezes desc;

-- termos buscados que não acharam nada
select props ->> 'termo' termo, count(*) vezes
from analytics.eventos where name = 'busca' and (props ->> 'resultados')::int = 0
group by 1 order by vezes desc;

-- tempo entre abrir o formulário e publicar o anúncio, por sessão
select session_id,
       max(created_at) filter (where name = 'anuncio_publicado')
     - min(created_at) filter (where name = 'anuncio_iniciado') as tempo_para_publicar
from analytics.eventos
where name in ('anuncio_iniciado', 'anuncio_publicado')
group by session_id
having max(created_at) filter (where name = 'anuncio_publicado') is not null;

-- em que etapa as pessoas desistem do anúncio (0 = Categoria, 1 = Detalhes, 2 = Preço)
select ultima_etapa, count(*) sessoes
from (
  select session_id, coalesce(max((props ->> 'etapa')::int), 0) as ultima_etapa
  from analytics.eventos
  where name in ('anuncio_iniciado', 'anuncio_etapa')
    and session_id not in (select session_id from analytics.eventos where name = 'anuncio_publicado')
  group by session_id
) s
group by ultima_etapa order by ultima_etapa;
```

Para levar ao relatório: o SQL Editor exporta o resultado em CSV (botão de download), que abre
no Excel ou no Google Planilhas.

## Privacidade e fim do projeto

- A coleta está descrita na Política de privacidade (`/privacidade`, itens 1, 2 e 5). Para os
  testes com usuários, o termo de consentimento do estudo deve mencioná-la.
- **Limpeza automática:** o job `limpeza-logs-de-teste` do `pg_cron` roda todo domingo às 3h (UTC)
  e apaga os eventos `dev` e `preview` com mais de 7 dias. Os de produção não são apagados.
- **Espaço:** cada evento ocupa ~265 bytes com os índices; uma sessão de teste inteira, ~10 KB.
  Para acompanhar:
  `select pg_size_pretty(pg_total_relation_size('public.app_events')) logs, pg_size_pretty(pg_database_size(current_database())) banco;`
- Os registros de produção ficam até o fim do projeto. Para apagar tudo:
  `delete from public.app_events;` (ou só o desenvolvimento: `where env = 'dev'`).
- Para adicionar um evento: `track('nome_do_evento', { detalhe: 'valor' })` em
  `$lib/telemetry`, só com dados não pessoais; documente aqui.
