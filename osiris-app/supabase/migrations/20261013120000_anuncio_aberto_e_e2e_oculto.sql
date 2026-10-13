-- MVP para testes com usuários:
-- 1. qualquer usuário logado pode anunciar produtos, máquinas e serviços;
-- 2. anúncios da suíte E2E deixam de aparecer para o público (só as contas de teste os veem).


-- 1. Anúncio liberado. As permissões continuam existindo: um admin ainda pode tirar de alguém.

alter table public.profiles
  alter column can_rent_out set default true,
  alter column can_offer_services set default true;

update public.profiles
set can_rent_out = true, can_offer_services = true
where not (can_rent_out and can_offer_services);


-- 2. Contas de teste e anúncios E2E.
--    A coluna fica fora dos grants públicos de profiles (privada) e protegida pelo trigger abaixo.

alter table public.profiles add column if not exists is_test_account boolean not null default false;

comment on column public.profiles.is_test_account is 'Conta usada pela suíte E2E. Seus anúncios não aparecem para o público.';

update public.profiles
set is_test_account = true
where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'); -- comprador-e2e, vendedor-e2e

create or replace function public.is_test_account(p_user_id uuid)
  returns boolean
  language sql stable security definer
  set search_path to 'public'
  as $$
  select coalesce((select is_test_account from public.profiles where id = p_user_id), false);
$$;

alter function public.is_test_account(uuid) owner to postgres;
revoke all on function public.is_test_account(uuid) from public;
grant execute on function public.is_test_account(uuid) to anon, authenticated, service_role;

-- anúncio de teste: de uma conta de teste, ou com nome no padrão da suíte ("[E2E] ...", "[E2E-SEED-OSIRIS] ...")
create or replace function public.is_test_listing(p_owner_id uuid, p_title text)
  returns boolean
  language sql stable
  set search_path to 'public'
  as $$
  select coalesce(p_title, '') ilike '[E2E%' or public.is_test_account(p_owner_id);
$$;

alter function public.is_test_listing(uuid, text) owner to postgres;
revoke all on function public.is_test_listing(uuid, text) from public;
grant execute on function public.is_test_listing(uuid, text) to anon, authenticated, service_role;

drop policy if exists "Visitantes podem ver produtos" on public.products;
create policy "Visitantes podem ver produtos" on public.products
  for select using (
    status::text = 'ativo'
    and (not public.is_test_listing(owner_id, name) or public.is_test_account(auth.uid()))
  );

drop policy if exists "Visitantes podem ver serviços ativos" on public.services;
create policy "Visitantes podem ver serviços ativos" on public.services
  for select using (
    status::text = 'ativo'
    and (not public.is_test_listing(owner_id, title) or public.is_test_account(auth.uid()))
  );

-- o próprio usuário não pode se marcar (ou desmarcar) como conta de teste
create or replace function public.protect_profile_account_type()
  returns trigger
  language plpgsql security invoker
  set search_path to 'public'
  as $$
begin
  if (new.account_type is distinct from old.account_type
      or new.can_rent_out is distinct from old.can_rent_out
      or new.can_offer_services is distinct from old.can_offer_services
      or new.is_test_account is distinct from old.is_test_account)
     and not public.current_user_is_admin()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Somente administradores podem alterar o tipo de conta e as permissões de anúncio.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_account_type_trigger on public.profiles;

create trigger protect_profile_account_type_trigger
  before update of account_type, can_rent_out, can_offer_services, is_test_account on public.profiles
  for each row execute function public.protect_profile_account_type();
