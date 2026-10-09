-- Correções de segurança e de regras de negócio levantadas na revisão de 2026-10-08.
-- Aplicar ANTES de publicar a versão do app que usa get_my_profile().


-- 1. profiles: e-mail, telefone e CPF deixam de ser legíveis por outros usuários e visitantes.
--    RLS filtra linhas, não colunas; por isso o SELECT passa a ser concedido por coluna.
--    Colunas novas em profiles ficam privadas até serem incluídas aqui.

revoke select on table public.profiles from anon, authenticated;

grant select (id, display_name, photo_url, role, created_at, account_type, can_rent_out, can_offer_services)
  on table public.profiles to anon, authenticated;

create or replace function public.get_my_profile()
  returns setof public.profiles
  language sql stable security definer
  set search_path to 'public'
  as $$
  select *
  from public.profiles
  where id = auth.uid();
$$;

alter function public.get_my_profile() owner to postgres;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated, service_role;


-- 2. profiles: só administradores alteram account_type e as capacidades de anunciar.
--    A versão anterior era SECURITY DEFINER: dentro dela current_user é sempre 'postgres',
--    então a exceção para postgres liberava qualquer usuário (inclusive para virar admin).
--    Como SECURITY INVOKER, current_user é o papel real de quem fez o UPDATE.

create or replace function public.protect_profile_account_type()
  returns trigger
  language plpgsql security invoker
  set search_path to 'public'
  as $$
begin
  if (new.account_type is distinct from old.account_type
      or new.can_rent_out is distinct from old.can_rent_out
      or new.can_offer_services is distinct from old.can_offer_services)
     and not public.current_user_is_admin()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Somente administradores podem alterar account_type e permissoes de anuncio.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_account_type_trigger on public.profiles;

create trigger protect_profile_account_type_trigger
  before update of account_type, can_rent_out, can_offer_services on public.profiles
  for each row execute function public.protect_profile_account_type();


-- 3. Notificações não usam mais o e-mail como nome de quem negociou ou avaliou.

create or replace function public.handle_new_negotiation()
  returns trigger
  language plpgsql security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_client_name character varying;
begin
  select coalesce(p.display_name, 'Um cliente')
    into v_client_name
  from public.profiles p
  where p.id = new.client_id;

  perform public.create_notification(
    new.provider_id,
    'nova_negociacao',
    'Nova solicitacao de negociacao',
    coalesce(v_client_name, 'Um cliente') || ' enviou uma nova proposta.',
    '/negociacoes/' || new.id,
    new.id
  );

  return new;
end;
$$;

create or replace function public.handle_new_review()
  returns trigger
  language plpgsql security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_reviewer_name character varying;
begin
  select coalesce(p.display_name, 'Alguem')
    into v_reviewer_name
  from public.profiles p
  where p.id = new.reviewer_id;

  perform public.create_notification(
    new.reviewee_id,
    'nova_avaliacao',
    'Voce recebeu uma avaliacao',
    coalesce(v_reviewer_name, 'Alguem') || ' avaliou voce com ' || new.rating || ' estrelas.',
    '/perfil/' || new.reviewee_id,
    new.booking_id
  );

  return new;
end;
$$;


-- 4. products: padroniza o status em minúsculas; a policy pública só enxerga 'ativo'.

update public.products set status = 'ativo' where status = 'Ativo';

alter table public.products alter column status set default 'ativo';


-- 5. reviews: avaliações ficam públicas para aparecerem no perfil e nos anúncios.

drop policy if exists "Participantes do agendamento podem ler as avaliações" on public.reviews;

create policy "Avaliações são públicas" on public.reviews
  for select using (true);


-- 6. negotiations: só o prestador aceita, recusa ou altera os termos da proposta.

create or replace function public.validate_negotiation_transition()
  returns trigger
  language plpgsql
  set search_path to 'public', 'pg_temp'
  as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
    or new.provider_id is distinct from old.provider_id
    or new.product_id is distinct from old.product_id
    or new.service_id is distinct from old.service_id
  then
    raise exception 'Participantes e alvo da negociacao sao imutaveis.';
  end if;

  if old.status in ('aceita', 'recusada', 'cancelado')
    and new.status is distinct from old.status
  then
    raise exception 'Negociacao encerrada nao pode mudar de status.';
  end if;

  if new.status = 'cancelado'
    and old.status not in ('solicitada', 'em_negociacao')
  then
    raise exception 'Somente negociacoes abertas podem ser canceladas.';
  end if;

  if auth.uid() is not null
    and auth.uid() not in (old.client_id, old.provider_id)
  then
    raise exception 'Apenas participantes podem alterar a negociacao.';
  end if;

  if auth.uid() is not null
    and auth.uid() is distinct from old.provider_id
    and not public.current_user_is_admin()
  then
    if new.status in ('aceita', 'recusada') and new.status is distinct from old.status then
      raise exception 'Apenas o prestador pode aceitar ou recusar a proposta.';
    end if;

    if new.proposed_price is distinct from old.proposed_price
      or new.proposed_start_date is distinct from old.proposed_start_date
      or new.proposed_end_date is distinct from old.proposed_end_date
    then
      raise exception 'Apenas o prestador pode alterar os termos da proposta.';
    end if;
  end if;

  return new;
end;
$$;


-- 7. bookings: termos do contrato imutáveis e status seguindo o fluxo
--    pendente -> em_operacao -> em_avaliacao -> finalizada (cancelamento via cancel_booking).

create or replace function public.validate_booking_transition()
  returns trigger
  language plpgsql
  set search_path to 'public', 'pg_temp'
  as $$
begin
  if auth.uid() is null or public.current_user_is_admin() then
    return new;
  end if;

  if new.provider_id is distinct from old.provider_id
    or new.client_id is distinct from old.client_id
    or new.product_id is distinct from old.product_id
    or new.service_id is distinct from old.service_id
    or new.negotiation_id is distinct from old.negotiation_id
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.scheduled_end_at is distinct from old.scheduled_end_at
    or new.total_price is distinct from old.total_price
  then
    raise exception 'Os termos da operacao sao imutaveis.';
  end if;

  if new.status is not distinct from old.status or new.status = 'cancelado' then
    return new;
  end if;

  if old.status = 'pendente' and new.status = 'em_operacao'
    or old.status = 'em_operacao' and new.status = 'em_avaliacao'
  then
    if auth.uid() is distinct from old.provider_id then
      raise exception 'Apenas o prestador pode avancar a operacao.';
    end if;
  elsif not (old.status = 'em_avaliacao' and new.status = 'finalizada') then
    raise exception 'Transicao de status invalida: % -> %.', old.status, new.status;
  end if;

  return new;
end;
$$;

alter function public.validate_booking_transition() owner to postgres;

create or replace trigger trg_validate_booking_transition
  before update on public.bookings
  for each row execute function public.validate_booking_transition();
