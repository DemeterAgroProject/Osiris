-- Objetos que existem no banco atual mas ficaram fora da migration inicial, porque o dump cobria só o
-- schema public. Sem eles, um banco novo (ex.: o Supabase self-hosted) não cria o perfil no cadastro.
-- Tudo aqui é idempotente: no banco atual não muda nada.


-- 1. Cria o perfil em public.profiles a cada usuário novo do Auth.

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER sem search_path fixo permite que um objeto homônimo em outro schema seja usado no lugar.
alter function public.handle_new_user() set search_path to 'public', 'pg_temp';


-- 2. Bucket público das imagens de anúncios (hoje preenchido pelo Dashboard; o app só guarda as URLs).

insert into storage.buckets (id, name, public)
values ('machinery-images', 'machinery-images', true)
on conflict (id) do nothing;
