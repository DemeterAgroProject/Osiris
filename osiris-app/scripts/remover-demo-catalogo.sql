-- Remove o catálogo de demonstração criado por scripts/demo-catalogo.sql.
--   npx supabase db query --linked -f scripts/remover-demo-catalogo.sql
-- Negociações e operações abertas com esses anúncios precisam ser apagadas antes (a remoção falha se existirem).

delete from public.product_images where product_id::text like 'd1000000-%';
delete from public.agricultural_machinery where product_id::text like 'd1000000-%';
delete from public.favorites where product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';
delete from public.products where id::text like 'd1000000-%';
delete from public.services where id::text like 'd4000000-%';
delete from auth.users where id::text like 'd0000000-%';

select
  (select count(*) from public.profiles where id::text like 'd0000000-%') as anunciantes_restantes,
  (select count(*) from public.products where id::text like 'd1000000-%') as produtos_restantes;
