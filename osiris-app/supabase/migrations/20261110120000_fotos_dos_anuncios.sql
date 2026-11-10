-- Fotos de anúncios enviadas pelo app (antes só havia links colados).
-- O app reduz e comprime a imagem no aparelho (WebP ou JPEG, até 1600 px) e grava em
-- machinery-images/<id do usuário>/<uuid>.<ext>. O bucket continua público para leitura.


-- 1. Limites do bucket: só imagens e no máximo 2 MB por arquivo (a foto comprimida fica bem abaixo).

update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'machinery-images';


-- 2. Cada usuário envia e apaga só na própria pasta, e só quem pode anunciar envia.
--    (SELECT na pasta própria é exigido pela API do Storage para apagar.)

drop policy if exists "fotos_anuncio_insert_proprio" on storage.objects;
create policy "fotos_anuncio_insert_proprio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'machinery-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (public.current_user_can_rent_out() or public.current_user_can_offer_services())
  );

drop policy if exists "fotos_anuncio_select_proprio" on storage.objects;
create policy "fotos_anuncio_select_proprio" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'machinery-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "fotos_anuncio_delete_proprio" on storage.objects;
create policy "fotos_anuncio_delete_proprio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'machinery-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
