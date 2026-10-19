-- Avaliações de um anúncio (produto, máquina ou serviço) para qualquer visitante.
-- A página do anúncio buscava as operações (bookings) do anúncio e depois as avaliações, mas as
-- operações só são legíveis pelos participantes: para os demais, o anúncio aparecia sempre "sem
-- avaliações". As avaliações já são públicas; a função devolve só elas, sem expor as operações,
-- e só as que os clientes deram ao anunciante.

create or replace function public.avaliacoes_do_anuncio(p_product_id uuid default null, p_service_id uuid default null)
  returns table (id uuid, rating integer, comment text, created_at timestamptz, booking_id uuid, reviewer_id uuid)
  language sql stable security definer
  set search_path to 'public'
  as $$
  select r.id, r.rating::integer, r.comment::text, r.created_at, r.booking_id, r.reviewer_id
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  where r.reviewee_id = b.provider_id
    and r.reviewer_id = b.client_id
    and ((p_product_id is not null and b.product_id = p_product_id)
      or (p_service_id is not null and b.service_id = p_service_id))
  order by r.created_at desc;
$$;

alter function public.avaliacoes_do_anuncio(uuid, uuid) owner to postgres;
revoke all on function public.avaliacoes_do_anuncio(uuid, uuid) from public;
grant execute on function public.avaliacoes_do_anuncio(uuid, uuid) to anon, authenticated, service_role;
