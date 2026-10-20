-- Mais dados técnicos: tração das máquinas, cultivar e safra das sementes,
-- equipamento incluso e raio de atendimento dos serviços. Todos opcionais.

alter table public.agricultural_machinery
  add column if not exists traction text
    constraint agricultural_machinery_traction_check check (traction in ('4x2', '4x4', 'esteira'));

comment on column public.agricultural_machinery.traction is '4x2 | 4x4 | esteira';

alter table public.products
  add column if not exists cultivar text
    constraint products_cultivar_check check (char_length(cultivar) <= 80),
  add column if not exists harvest text
    constraint products_harvest_check check (harvest ~ '^\d{4}(/\d{2})?$');

comment on column public.products.cultivar is 'Sementes e mudas: cultivar ou híbrido.';
comment on column public.products.harvest is 'Safra: "2025/26" ou "2026".';

alter table public.services
  add column if not exists equipment text
    constraint services_equipment_check check (char_length(equipment) <= 200),
  add column if not exists service_radius_km integer
    constraint services_service_radius_km_check check (service_radius_km between 1 and 2000);

comment on column public.services.equipment is 'Equipamento incluso no serviço (ex.: "colheitadeira 30 pés + caminhão").';
comment on column public.services.service_radius_km is 'Distância máxima atendida a partir da cidade (municipio_id), em km.';
