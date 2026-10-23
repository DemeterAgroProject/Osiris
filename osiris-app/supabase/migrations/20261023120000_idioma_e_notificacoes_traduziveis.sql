-- App em português, inglês e espanhol (ver docs/i18n.md).
-- 1. profiles.locale: idioma escolhido pela pessoa (o app grava; o push sai nesse idioma). Como a
--    cidade do perfil, só o próprio usuário escreve e ninguém lê pela API (não é dado público).
-- 2. notifications.params: dados variáveis da notificação (nome, nota, status). O app e a Edge
--    Function send-push montam o texto pelo type + params no idioma de quem lê; title e body
--    continuam gravados em português (notificações antigas e tipos sem tradução usam esses).

alter table public.profiles
  add column if not exists locale text not null default 'pt' check (locale in ('pt', 'en', 'es'));

comment on column public.profiles.locale is 'Idioma do app (pt, en, es); usado no texto do push.';

grant update (locale) on table public.profiles to authenticated;

alter table public.notifications
  add column if not exists params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object');

comment on column public.notifications.params is 'Dados variáveis do texto (nome, nota, status), traduzido pelo type no app e no push.';

-- create_notification ganha p_params (com default: as chamadas com 6 argumentos continuam valendo)
drop function if exists public.create_notification(uuid, character varying, character varying, text, text, uuid);

create function public.create_notification(
  p_user_id uuid,
  p_type character varying,
  p_title character varying,
  p_body text,
  p_link text,
  p_related_id uuid,
  p_params jsonb default '{}'::jsonb
) returns void
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
  as $$
begin
  if p_type = 'nova_mensagem' then
    insert into public.notifications (user_id, type, title, body, link, related_id, params, updated_at)
    values (p_user_id, p_type, p_title, p_body, p_link, p_related_id, coalesce(p_params, '{}'), now())
    on conflict (user_id, related_id, type)
      where type = 'nova_mensagem' and is_read = false
    do update set
      title = excluded.title,
      body = excluded.body,
      link = excluded.link,
      params = excluded.params,
      updated_at = now();
  else
    insert into public.notifications (user_id, type, title, body, link, related_id, params)
    values (p_user_id, p_type, p_title, p_body, p_link, p_related_id, coalesce(p_params, '{}'));
  end if;
end;
$$;

alter function public.create_notification(uuid, character varying, character varying, text, text, uuid, jsonb) owner to postgres;
revoke all on function public.create_notification(uuid, character varying, character varying, text, text, uuid, jsonb) from public, anon, authenticated;
grant all on function public.create_notification(uuid, character varying, character varying, text, text, uuid, jsonb) to service_role;

-- triggers que têm parte variável no texto passam a mandar os params

create or replace function public.handle_new_review()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_reviewer_name character varying;
begin
  select p.display_name
    into v_reviewer_name
  from public.profiles p
  where p.id = new.reviewer_id;

  perform public.create_notification(
    new.reviewee_id,
    'nova_avaliacao',
    'Voce recebeu uma avaliacao',
    coalesce(v_reviewer_name, 'Alguem') || ' avaliou voce com ' || new.rating || ' estrelas.',
    '/perfil/' || new.reviewee_id,
    new.booking_id,
    jsonb_strip_nulls(jsonb_build_object('nome', v_reviewer_name, 'nota', new.rating))
  );

  return new;
end;
$$;

create or replace function public.handle_new_negotiation()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_client_name character varying;
begin
  select p.display_name
    into v_client_name
  from public.profiles p
  where p.id = new.client_id;

  perform public.create_notification(
    new.provider_id,
    'nova_negociacao',
    'Nova solicitacao de negociacao',
    coalesce(v_client_name, 'Um cliente') || ' enviou uma nova proposta.',
    '/negociacoes/' || new.id,
    new.id,
    jsonb_strip_nulls(jsonb_build_object('nome', v_client_name))
  );

  return new;
end;
$$;

create or replace function public.handle_booking_status_change()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_recipient uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'cancelado' then
    v_recipient := case
      when new.cancelled_by = new.client_id then new.provider_id
      else new.client_id
    end;

    perform public.create_notification(
      v_recipient,
      'operacao_cancelada',
      'Operacao cancelada',
      'Sua operacao foi cancelada. Clique aqui para ver o motivo e avaliar sua experiencia com este usuario.',
      '/operacoes/' || new.id,
      new.id
    );

    return new;
  end if;

  perform public.create_notification(
    new.client_id,
    'status_reserva',
    'Status da operacao atualizado',
    'Sua operacao agora esta: ' || new.status,
    '/operacoes/' || new.id,
    new.id,
    jsonb_build_object('status', new.status)
  );

  perform public.create_notification(
    new.provider_id,
    'status_reserva',
    'Status da operacao atualizado',
    'A operacao agora esta: ' || new.status,
    '/operacoes/' || new.id,
    new.id,
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;
