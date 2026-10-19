-- Inscrição de push pelo app: registra o aparelho para quem está logado.
-- O upsert direto em push_subscriptions falhava quando outra conta já tinha entrado no mesmo
-- navegador (o endpoint é único e a policy não deixa atualizar a linha de outro usuário).
-- Agora o aparelho passa para a conta atual: só ela recebe as notificações dali em diante.

create or replace function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text)
  returns void
  language plpgsql security definer
  set search_path to 'public'
  as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Entre na sua conta para ativar as notificações.' using errcode = '42501';
  end if;

  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Inscrição de notificação inválida.' using errcode = 'P0001';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_user, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

alter function public.registrar_push(text, text, text) owner to postgres;
revoke all on function public.registrar_push(text, text, text) from public, anon;
grant execute on function public.registrar_push(text, text, text) to authenticated, service_role;
