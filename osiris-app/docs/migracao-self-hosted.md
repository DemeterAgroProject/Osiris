# Migração para o Supabase self-hosted

Lista de verificação para levar o Osiris do Supabase hospedado (projeto `atghygulbvmtflcipcsr`) para uma VM própria. Levantada em 2026-10-10 a partir do banco atual. Confira cada item na documentação oficial de self-hosting do Supabase, porque nomes de variáveis e passos mudam entre versões.

## Inventário do que existe hoje

| Item | Onde está | Recriado por |
| --- | --- | --- |
| Tabelas, policies, funções, triggers do `public` | banco | migrations em `supabase/migrations/` |
| Trigger `on_auth_user_created` (cria o perfil no cadastro) | `auth.users` | migration `20261010120000` |
| Bucket público `machinery-images` (5 arquivos, ~1,2 MB) | Storage | migration `20261010120000` (só o bucket; os arquivos, não) |
| Job `lembretes-de-avaliacao` (de hora em hora) | `pg_cron` | migration `20261009120000` |
| Publicação Realtime de `negotiation_messages` e `notifications` | banco | migration inicial |
| Segredos `project_url` e `push_webhook_secret` | Vault | manual (passo 5) |
| Edge Function `send-push` e seus secrets | Edge Functions | manual (passo 6) |
| Login com Google, URLs de redirecionamento, e-mail | Auth | manual (passo 7) |
| Dados (usuários, anúncios, negociações...) | banco | manual (passo 3) |

## Passo a passo

1. **VM e Supabase no ar.** Subir o Supabase pelo Docker Compose oficial, com senhas e chaves novas (senha do Postgres, JWT secret, chaves anon e service role). Colocar HTTPS na frente (proxy reverso com certificado): o app é um PWA, e service worker e push só funcionam em HTTPS.
2. **Schema.** Aplicar as migrations no banco novo, em ordem: `npx supabase db push --db-url "<url do Postgres da VM>"`. Conferir que as extensões `pg_net`, `pg_cron` e `supabase_vault` estão ativas.
3. **Dados.** Exportar os dados do projeto atual (schemas `public` e `auth`, para manter os logins) e importar no novo **com os triggers desligados** (`set session_replication_role = replica` na sessão da importação). Sem isso, a importação dispara notificações, push e a criação de perfis duplicados.
4. **Arquivos do Storage.** Copiar os 5 arquivos do bucket `machinery-images` para o bucket novo. Depois, reescrever as URLs em `public.product_images`: 9 das 10 imagens apontam para `https://atghygulbvmtflcipcsr.supabase.co/storage/...` e vão quebrar se não forem trocadas pelo endereço novo.
5. **Vault.** Criar `project_url` (o endereço novo) e `push_webhook_secret`. O `scripts/configurar-push.ps1` faz isso, mas hoje tem o `project-ref` do projeto atual fixo e usa comandos do Supabase hospedado: precisa ser adaptado.
6. **Edge Function `send-push`.** Publicar no runtime de funções da VM, sem verificação de JWT (a função confere o `x-webhook-secret`), com os secrets `PUSH_WEBHOOK_SECRET` (o mesmo valor do Vault), `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. **Reaproveitar as mesmas chaves VAPID**: com chaves novas, todas as inscrições de push existentes param de funcionar.
7. **Auth.** Configurar o provedor Google (client ID e secret, com a URL de callback nova cadastrada no Google Cloud), a URL do site, as URLs de redirecionamento permitidas e o envio de e-mail (SMTP).
8. **App.** Trocar no `.env` (e no ambiente de produção) `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` pelos novos. `VITE_VAPID_PUBLIC_KEY` continua igual.
9. **Banco de testes.** Criar um segundo banco (ou instância) só para os testes E2E, com as contas `comprador-e2e` e `vendedor-e2e`. Assim os testes param de gravar na produção e podem entrar no CI.
10. **Validação antes da troca.** Rodar `npm run test:e2e` contra o ambiente novo e repetir o roteiro manual (perfil, negociação, operação, cancelamento, push).
11. **Troca.** Avisar os usuários, parar as escritas no projeto atual, fazer a sincronização final dos dados (passos 3 e 4), apontar o app para o ambiente novo e acompanhar os logs nas primeiras horas. Manter o projeto antigo parado, sem apagar, até confirmar que está tudo certo.
