-- Serviço pode ter uma foto de capa (URL), como os produtos. Antes todo serviço aparecia sem imagem na vitrine.

alter table public.services
  add column if not exists image_url text
  constraint services_image_url_check check (image_url is null or image_url ~* '^https?://');

comment on column public.services.image_url is 'Foto de capa do serviço (URL http/https). Opcional.';
