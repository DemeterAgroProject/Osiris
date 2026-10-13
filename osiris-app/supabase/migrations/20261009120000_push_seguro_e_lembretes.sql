-- Push sem service_role no trigger e lembretes de avaliação agendados.
--
-- Pré-requisitos (fora da migration, porque são segredos):
--   select vault.create_secret('<url do projeto>', 'project_url');
--   select vault.create_secret('<segredo aleatório>', 'push_webhook_secret');
--   supabase secrets set PUSH_WEBHOOK_SECRET=<mesmo segredo>
-- Sem esses segredos, as notificações continuam sendo gravadas; só o push deixa de sair.


-- 1. Push: o Database Webhook antigo levava a service_role key no cabeçalho Authorization.
--    O novo trigger envia só o id da notificação e um segredo próprio, lido do Vault.

drop trigger if exists "send-push-on-insert" on public.notifications;

create or replace function public.notify_push()
  returns trigger
  language plpgsql security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';

  if v_url is null or v_secret is null then
    raise warning 'notify_push: segredos project_url/push_webhook_secret ausentes no Vault; push nao enviado.';
    return new;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/send-push',
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', jsonb_build_object('id', new.id)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  -- falha no push nunca deve impedir a notificação de ser gravada
  raise warning 'notify_push: %', sqlerrm;
  return new;
end;
$$;

alter function public.notify_push() owner to postgres;

revoke all on function public.notify_push() from public, anon, authenticated;

create trigger trg_notify_push
  after insert on public.notifications
  for each row execute function public.notify_push();


-- 2. Lembretes de avaliação: send_due_review_reminders() existia, mas nada a chamava.

create extension if not exists pg_cron;

select cron.schedule(
  'lembretes-de-avaliacao',
  '0 * * * *',
  $$select public.send_due_review_reminders()$$
);
