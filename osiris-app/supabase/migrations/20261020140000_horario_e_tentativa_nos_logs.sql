-- Ajustes nos logs depois do primeiro teste em produção (ver docs/logs.md):
-- 1. Horário do evento: o app junta os eventos e envia a cada 4 s, e o banco gravava a hora de
--    chegada do lote (vários eventos no mesmo segundo, fora de ordem). Agora o app manda há quanto
--    tempo cada evento aconteceu (client_delay_ms, relógio do próprio app, até 1 h) e a hora é
--    a de chegada menos esse atraso. A hora continua vindo do servidor: o relógio do aparelho
--    não entra na conta.
-- 2. Funil do anúncio por tentativa (props.tentativa, um id por abertura do formulário): a mesma
--    sessão pode desistir de um anúncio e publicar outro. Eventos antigos, sem tentativa, contam
--    pela sessão.

alter table public.app_events
  add column if not exists client_delay_ms integer check (client_delay_ms between 0 and 3600000);

comment on column public.app_events.client_delay_ms is
  'Quanto tempo o evento esperou no app até ser enviado; created_at = chegada - esse atraso.';

create or replace function public.app_events_set_user()
  returns trigger
  language plpgsql
  set search_path to 'public'
  as $$
begin
  new.user_id := auth.uid();
  new.created_at := now() - make_interval(secs => coalesce(new.client_delay_ms, 0) / 1000.0);
  return new;
end;
$$;

grant insert (client_delay_ms) on table public.app_events to anon, authenticated;

create or replace view analytics.funil_anuncio as
with s as (
  select coalesce(e.props ->> 'tentativa', e.session_id) as tentativa,
         bool_or(e.name = 'anuncio_iniciado') as iniciou,
         bool_or(e.name = 'anuncio_etapa' and (e.props ->> 'etapa')::int >= 1) as chegou_detalhes,
         bool_or(e.name = 'anuncio_etapa' and (e.props ->> 'etapa')::int >= 2) as chegou_preco,
         bool_or(e.name = 'anuncio_publicado') as publicou,
         bool_or(e.name = 'anuncio_falhou') as falhou
  from public.app_events e
  where e.env = 'prod' and e.name like 'anuncio\_%'
  group by 1
)
select count(*) filter (where iniciou) as iniciaram,
       count(*) filter (where chegou_detalhes) as chegaram_detalhes,
       count(*) filter (where chegou_preco) as chegaram_preco,
       count(*) filter (where publicou) as publicaram,
       count(*) filter (where falhou) as tiveram_erro
from s;
