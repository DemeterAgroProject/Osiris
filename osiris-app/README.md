# Osiris

Marketplace agro em formato de app mobile (PWA) para anunciar e contratar **maquinário agrícola**, **produtos e insumos** e **serviços** (mão de obra ou pacote completo). O fluxo vai do anúncio à negociação, contrato, operação em campo e avaliação.

## Stack

- **SvelteKit 2 + Svelte 5** (runes), JavaScript com JSDoc
- **Tailwind CSS 4 + Skeleton v4**, ícones `lucide-svelte`
- **Supabase**: Auth, Postgres com RLS, Realtime, Vault, `pg_cron` e Edge Functions
- **Web Push**: `static/sw.js` + Edge Function `send-push`

O app fala direto com o Supabase pelo cliente em `src/lib/supabase.js`; não há API própria. As regras de negócio e de permissão ficam no banco (policies, triggers e RPCs).

## Rodando localmente

```sh
npm install
cp .env.example .env   # preencha com os dados do projeto Supabase
npm run dev
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm run preview` | build de produção e pré-visualização |
| `npm run lint` | ESLint |
| `npm run check` | `svelte-check` (tipos via JSDoc) |

## Fluxo principal

1. **Anunciar** (`/anunciar`, `/servicos/novo`): produto, maquinário (`products` + `agricultural_machinery`) ou serviço. Exige `can_rent_out` ou `can_offer_services` no perfil, concedidos por um admin.
2. **Negociar** (`/negociacoes/[id]`): proposta de preço e período com chat em tempo real. Status `solicitada` → `em_negociacao` → `aceita` / `recusada` / `cancelado`. Só o prestador aceita, recusa ou altera os termos.
3. **Contrato**: ao aceitar, a RPC `aceitar_negociacao` cria o registro em `bookings`.
4. **Operação** (`/operacoes/[id]`): `pendente` → `em_operacao` → `em_avaliacao` → `finalizada`, avançada pelo prestador. Cancelamento via RPC `cancel_booking`, com motivo.
5. **Avaliação**: cliente e prestador se avaliam; a operação finaliza quando os dois avaliam. Lembretes saem a cada hora pelo job `lembretes-de-avaliacao` do `pg_cron`.

## Banco de dados

O schema é versionado em `supabase/migrations/`. A primeira migration é o estado do banco em 2026-09-25; as seguintes são incrementais.

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list   # compara local x remoto
npx supabase db push          # aplica migrations pendentes
```

Dados pessoais do perfil (e-mail, telefone, CPF) não são legíveis por outros usuários: leia o próprio perfil com `supabase.rpc('get_my_profile')` (ver `src/lib/profiles.js`) e use só as colunas públicas para os demais.

## Push

Cada `insert` em `notifications` dispara o trigger `trg_notify_push`, que chama a Edge Function `send-push` com o id da notificação e o cabeçalho `x-webhook-secret`. A função confere o segredo, busca a notificação no banco e envia o push para as inscrições do usuário, removendo as expiradas.

Configuração (uma vez por projeto):

- Vault: segredos `project_url` e `push_webhook_secret`
- Secrets da função: `PUSH_WEBHOOK_SECRET` (mesmo valor do Vault), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Deploy: `npx supabase functions deploy send-push --use-api --no-verify-jwt`
