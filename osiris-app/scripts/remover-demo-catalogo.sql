-- Remove o catálogo de demonstração criado por scripts/demo-catalogo.sql, com as negociações,
-- operações, avaliações, favoritos e notificações ligadas a ele.
--   npx supabase db query --linked -f scripts/remover-demo-catalogo.sql

create temp table demo_negociacoes on commit drop as
select id from public.negotiations
where client_id::text like 'd0000000-%' or provider_id::text like 'd0000000-%'
   or product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';

create temp table demo_operacoes on commit drop as
select id from public.bookings
where client_id::text like 'd0000000-%' or provider_id::text like 'd0000000-%'
   or product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%'
   or negotiation_id in (select id from demo_negociacoes);

delete from public.reviews where booking_id in (select id from demo_operacoes)
   or reviewer_id::text like 'd0000000-%' or reviewee_id::text like 'd0000000-%';
delete from public.notifications
where user_id::text like 'd0000000-%'
   or related_id in (select id from demo_negociacoes union all select id from demo_operacoes);
delete from public.bookings where id in (select id from demo_operacoes);
delete from public.negotiation_messages where negotiation_id in (select id from demo_negociacoes);
delete from public.negotiations where id in (select id from demo_negociacoes);
delete from public.favorites where product_id::text like 'd1000000-%' or service_id::text like 'd4000000-%';
delete from public.product_images where product_id::text like 'd1000000-%';
delete from public.agricultural_machinery where product_id::text like 'd1000000-%';
delete from public.products where id::text like 'd1000000-%';
delete from public.services where id::text like 'd4000000-%';
delete from public.push_subscriptions where user_id::text like 'd0000000-%';
delete from auth.users where id::text like 'd0000000-%';

select
  (select count(*) from public.profiles where id::text like 'd0000000-%') as anunciantes_restantes,
  (select count(*) from public.products where id::text like 'd1000000-%') as produtos_restantes;
