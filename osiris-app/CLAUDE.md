# CLAUDE.md

Marketplace agro (PWA) em SvelteKit + Supabase: anúncios de maquinário, produtos e serviços, com negociação, contrato (operação) e avaliação. Visão geral e setup em `README.md`.

## Comandos

```sh
npm run dev      # dev server
npm run lint     # ESLint (precisa passar sem avisos)
npm run check    # svelte-check
npm run build
npm run test:e2e # Playwright (tests/e2e); 1ª vez: npx playwright install chromium
```

Rode `lint` e `check` antes de considerar uma mudança pronta. Os testes E2E rodam contra o **banco real** (o projeto só tem um), com as contas `comprador-e2e` e `vendedor-e2e` (não admin) e as variáveis `OSIRIS_E2E_PASSWORD` e `SUPABASE_SERVICE_ROLE_KEY` do `.env`; eles criam registros `[E2E]` e os apagam no teardown. Não rode a suíte sem necessidade e nunca em paralelo com outra pessoa.

## Arquitetura

- **Svelte 5 com runes** (`$state`, `$derived`, `$effect`, `$props`), JavaScript + JSDoc, sem TypeScript no app (a Edge Function é TS/Deno).
- **Não existe backend próprio**: as páginas chamam o Supabase direto via `src/lib/supabase.js`. Não há `+page.server.js` nem `+layout.js`.
- **As regras de negócio e de permissão moram no banco** (RLS, triggers, RPCs). O app só reflete essas regras na UI; nunca confie em checagem só do lado do cliente.
- UI: Tailwind 4 + Skeleton v4 (classes como `preset-filled-primary-500`, `bg-surface-50-950`), ícones `lucide-svelte`.
- Arquivos `.svelte` usam CRLF; alguns usam tabs e outros 4 espaços. Mantenha o estilo do arquivo que está editando.

## Convenções do app

- Links e navegação sempre com `resolve()` de `$app/paths`: `href={resolve('/x')}`, `goto(resolve('/x'))` (exigido pelo ESLint).
- Todo `{#each}` tem chave: `{#each items as item (item.id)}`.
- Diálogo, gaveta, menu, popover, abas, toast e nota com estrelas vêm de `src/lib/components/ui/` (`AppDialog`, `AppConfirmDialog`, `AppMenu`, `AppPopover`, `AppTabs`/`AppTabsPanel`, `AppRating`, `AppSteps` para as etapas de assistentes), que envolvem o Skeleton já com as classes do app. As telas importam essas versões, não `@skeletonlabs/skeleton-svelte` direto. Toast: `showToast(mensagem)` de `$lib/components/ui/toast.js`.
- `Map` e `URLSearchParams` locais que não são estado usam a classe nativa com `// eslint-disable-next-line svelte/prefer-svelte-reactivity -- <motivo>`; `SvelteMap` só quando o valor é reativo.
- **Perfis**: e-mail, telefone e CPF não são legíveis por outros usuários (privilégio por coluna). Use `fetchProfile()` / `PUBLIC_PROFILE_COLUMNS` de `src/lib/profiles.js`. Nunca `select('*')` em `profiles`, nem `.select()` com colunas sensíveis após um `update`: falha com "permission denied".
- Cancelar operação: sempre pela RPC `cancel_booking` (componente `CancelBookingDialog.svelte`), nunca `update({ status: 'cancelado' })`.
- Aceitar proposta: RPC `aceitar_negociacao` (cria o registro em `bookings`).
- Status de anúncio em minúsculas: `'ativo'` / `'pausado'`.

## Regras de negócio (aplicadas por triggers)

- **Negociação** (`negotiations.status`): `solicitada` → `em_negociacao` → `aceita` | `recusada` | `cancelado`. Só o prestador (`provider_id`) aceita, recusa ou altera preço/datas. Participantes e alvo são imutáveis.
- **Operação** (`bookings.status`): `pendente` → `em_operacao` → `em_avaliacao` → `finalizada`. O prestador avança as duas primeiras etapas; qualquer participante finaliza. Cancelamento só a partir de `pendente`/`em_operacao`, com motivo (`cancellation_reason`; `other` exige 15+ caracteres). Preço, datas e participantes são imutáveis.
- **Permissões**: `account_type` (`cliente`/`admin`), `can_rent_out` e `can_offer_services` só mudam por admin. Admins (`current_user_is_admin()`) passam por cima das regras de transição.
- Notificações são criadas por triggers (`create_notification`); o app não insere em `notifications`.

## Banco de dados (Supabase)

- Schema versionado em `supabase/migrations/`. `20260925143656_initial_schema.sql` é o estado do banco antes da revisão; as demais são incrementais. Todas já estão aplicadas no remoto.
- Fluxo de mudança: escreva uma migration nova (nunca edite uma já aplicada), teste no banco real dentro de `begin; ... rollback;` com `npx supabase db query --linked -f arquivo.sql`, e só então `npx supabase db push`. A CLI executa o arquivo inteiro numa única transação, então o rollback desfaz tudo.
- Para testar como usuário dentro da transação: `set local role authenticated` + `set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role', 'authenticated')::text, true)`. Atenção: vários perfis de teste são admin e mascaram as regras; rebaixe-os para `cliente` dentro da mesma transação.
- Armadilha: em função `SECURITY DEFINER`, `current_user` é sempre o dono (`postgres`). Checagens baseadas em `current_user` precisam de `SECURITY INVOKER`.
- O dump completo (`supabase db dump`) e o `db diff` precisam do Docker Desktop rodando.
- Há registros `[E2E]` e `[E2E-SEED-OSIRIS]` usados por uma suíte E2E externa: não apague.

## Push

`insert` em `notifications` → trigger `trg_notify_push` → `net.http_post` para a Edge Function `send-push` com só o id da notificação e o cabeçalho `x-webhook-secret` (lido do Vault, `push_webhook_secret`). A função (deploy com `--no-verify-jwt`) confere o segredo, busca a notificação e envia o Web Push. Para configurar ou rotacionar o segredo: `scripts/configurar-push.ps1`. Lembretes de avaliação: job `lembretes-de-avaliacao` do `pg_cron`, de hora em hora.

## Segredos

Nunca coloque chaves em migrations, código ou commits: segredos ficam no `.env` local (gitignored), no Vault ou nos secrets da Edge Function. `supabase/.temp/` é cache da CLI e está no `.gitignore`.

## Commits

Mensagens em português, no formato `tipo(escopo): descrição` (`fix`, `chore`, `docs`, `refactor`). Sem linha `Co-Authored-By`.
