# Osiris — guia do desenvolvedor

Marketplace agro em formato de app mobile (PWA) para anunciar e contratar **maquinário agrícola**, **produtos e insumos** e **serviços** (mão de obra ou pacote completo). O fluxo vai do anúncio à negociação, contrato, operação em campo e avaliação. Visão geral do projeto no [README da raiz](../README.md); convenções do código no [CLAUDE.md](CLAUDE.md).

## Stack

- **SvelteKit 2 + Svelte 5** (runes), JavaScript com JSDoc
- **Tailwind CSS 4 + Skeleton v4**, ícones `lucide-svelte`
- **Paraglide JS**: textos em português, inglês e espanhol (`messages/`)
- **Supabase**: Auth (Google), Postgres com RLS, Realtime, Vault, `pg_cron` e Edge Functions
- **Web Push**: `static/sw.js` + Edge Function `send-push`
- **Playwright** para testes E2E; deploy na **Vercel** a partir da `main`

O app fala direto com o Supabase pelo cliente em `src/lib/supabase.js`; não há API própria. As regras de negócio e de permissão ficam no banco (policies, triggers e RPCs).

## Rodando localmente

Pré-requisito: Node.js 24.

```sh
npm install            # também compila os textos (npm run i18n)
cp .env.example .env   # preencha com os dados do projeto Supabase
npm run dev
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm run preview` | build de produção e pré-visualização |
| `npm run lint` | ESLint (precisa passar sem avisos) |
| `npm run check` | compila os textos e roda o `svelte-check` (tipos via JSDoc) |
| `npm run i18n` | compila `messages/*.json` em `src/lib/paraglide` (pasta gerada, fora do git) |
| `npm run test:e2e` | testes E2E com Playwright (1ª vez: `npx playwright install chromium`) |

O CI do GitHub roda `lint`, `check` e `build` em todo PR; os três precisam passar.

### Variáveis de ambiente

Ver `.env.example`. O app usa `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` e `VITE_VAPID_PUBLIC_KEY`; os testes E2E usam também `OSIRIS_E2E_PASSWORD` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca commite o `.env`.

## Fluxo principal

1. **Anunciar** (`/anunciar`, `/servicos/novo`): produto, maquinário (`products` + `agricultural_machinery`) ou serviço, sempre com a cidade (`municipio_id`, código IBGE). Todo usuário novo pode anunciar (`can_rent_out` e `can_offer_services` nascem verdadeiros; um admin pode retirar).
2. **Negociar** (`/negociacoes/[id]`): proposta de preço e período com chat em tempo real. Status `solicitada` → `em_negociacao` → `aceita` / `recusada` / `cancelado`. Só o prestador aceita, recusa ou altera os termos.
3. **Contrato**: ao aceitar, a RPC `aceitar_negociacao` cria o registro em `bookings`.
4. **Operação** (`/operacoes/[id]`): `pendente` → `em_operacao` → `em_avaliacao` → `finalizada`, avançada pelo prestador. Cancelamento via RPC `cancel_booking`, com motivo.
5. **Avaliação**: cliente e prestador se avaliam; a operação finaliza quando os dois avaliam. Lembretes saem a cada hora pelo job `lembretes-de-avaliacao` do `pg_cron`.

## Banco de dados

O schema é versionado em `supabase/migrations/`. A primeira migration é o estado do banco em 2026-09-25; as seguintes são incrementais. Nunca edite uma migration já aplicada: crie outra.

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list   # compara local x remoto
npx supabase db push          # aplica migrations pendentes
```

Antes do `db push`, teste a migration no banco dentro de `begin; ... rollback;` com `npx supabase db query --linked -f arquivo.sql` (detalhes no CLAUDE.md).

Dados pessoais do perfil (e-mail, telefone, CPF, cidade, idioma) não são legíveis por outros usuários: leia o próprio perfil com `supabase.rpc('get_my_profile')` (ver `src/lib/profiles.js`) e use só as colunas públicas para os demais.

### Catálogo de demonstração

`scripts/demo-catalogo.sql` cria uma vitrine para apresentações: 4 anunciantes fictícios com máquinas, insumos, serviços e avaliações. Rodar de novo recria tudo; `scripts/remover-demo-catalogo.sql` apaga.

## Push

Cada `insert` em `notifications` dispara o trigger `trg_notify_push`, que chama a Edge Function `send-push` com o id da notificação e o cabeçalho `x-webhook-secret`. A função confere o segredo, busca a notificação no banco, monta o texto no idioma de quem recebe (`profiles.locale`) e envia o push para as inscrições do usuário, removendo as expiradas.

Configuração (uma vez por projeto):

- Vault: segredos `project_url` e `push_webhook_secret` (`scripts/configurar-push.ps1`)
- Secrets da função: `PUSH_WEBHOOK_SECRET` (mesmo valor do Vault), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (par gerado por `scripts/gerar-vapid.ps1`)
- Deploy: `npx supabase functions deploy send-push --use-api --no-verify-jwt`

No iPhone, o push só funciona com o app adicionado à tela de início.

## Idiomas

Os textos ficam em `messages/{pt,en,es}.json` e são usados com `m.chave()`. O idioma vem da escolha em **Mais → Idioma** (cookie), senão do navegador, senão português. Como adicionar textos ou idiomas: [docs/i18n.md](docs/i18n.md).

## Logs de uso e de erros

O app registra eventos de uso e erros em `public.app_events` para analisar os testes com usuários (sem dados pessoais). Eventos e consultas prontas: [docs/logs.md](docs/logs.md).

## Testes

Os testes E2E (`tests/e2e/`) rodam contra o banco real, com as contas `comprador-e2e` e `vendedor-e2e`; criam registros `[E2E]` e os apagam no fim. Não rode a suíte em paralelo com outra pessoa. Cenários e cobertura: [docs/plano-de-testes.md](docs/plano-de-testes.md).

## Outros documentos

- [docs/migracao-self-hosted.md](docs/migracao-self-hosted.md): lista de verificação para levar o back-end para um Supabase self-hosted
- `docs/pesquisa/`: script do formulário de avaliação usado nos testes com usuários
