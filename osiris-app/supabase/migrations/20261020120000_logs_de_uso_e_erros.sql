-- Logs de uso (eventos) e de erros do app, para analisar os testes com usuários.
-- O app só INSERE (visitantes e usuários logados); ninguém lê pela API. A leitura é feita pelo
-- painel do Supabase / SQL, de preferência pelas views do schema analytics (não exposto na API).
-- Privacidade: sem e-mail, telefone, texto de mensagens ou o que a pessoa digita; user_id vem do
-- token (auth.uid()), nunca do app. Ver a Política de privacidade (/privacidade) e docs/logs.md.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'event' check (kind in ('event', 'error')),
  name text not null check (char_length(name) between 1 and 80),
  path text check (char_length(path) <= 300),
  route text check (char_length(route) <= 120),
  session_id text not null check (char_length(session_id) between 8 and 64),
  user_id uuid,
  env text not null default 'prod' check (env in ('prod', 'preview', 'dev')),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 4000)
);

comment on table public.app_events is 'Eventos de uso e erros do app (kind). Só inserção pelo app; leitura via schema analytics.';

create index if not exists app_events_created_idx on public.app_events (created_at desc);
create index if not exists app_events_name_idx on public.app_events (kind, name, created_at desc);
create index if not exists app_events_session_idx on public.app_events (session_id, created_at);

-- quem está logado é decidido pelo token, não pelo que o app manda
create or replace function public.app_events_set_user()
  returns trigger
  language plpgsql
  set search_path to 'public'
  as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists app_events_set_user on public.app_events;
create trigger app_events_set_user before insert on public.app_events
  for each row execute function public.app_events_set_user();

alter table public.app_events enable row level security;

drop policy if exists "App registra eventos" on public.app_events;
create policy "App registra eventos" on public.app_events for insert to anon, authenticated with check (true);
-- sem policy de select/update/delete: pela API ninguém lê nem altera

revoke all on table public.app_events from anon, authenticated;
grant insert (kind, name, path, route, session_id, env, props) on table public.app_events to anon, authenticated;


-- Consultas prontas para a análise (schema fora da API do Supabase)

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

-- eventos de produção com o usuário identificado só por um apelido estável (sem o uuid)
create or replace view analytics.eventos as
select e.id, e.created_at, (e.created_at at time zone 'America/Sao_Paulo') as horario_brasilia,
       e.kind, e.name, e.route, e.path, e.session_id,
       case when e.user_id is null then null else 'u-' || left(md5(e.user_id::text), 8) end as usuario,
       e.props
from public.app_events e
where e.env = 'prod';

-- erros mais frequentes nos últimos 30 dias
create or replace view analytics.erros_frequentes as
select e.name, coalesce(e.props ->> 'message', '') as mensagem, e.route,
       count(*) as vezes, count(distinct e.session_id) as sessoes,
       min(e.created_at) as primeira_vez, max(e.created_at) as ultima_vez
from public.app_events e
where e.kind = 'error' and e.env = 'prod' and e.created_at > now() - interval '30 days'
group by 1, 2, 3
order by vezes desc;

-- uso por dia
create or replace view analytics.uso_por_dia as
select (e.created_at at time zone 'America/Sao_Paulo')::date as dia,
       count(distinct e.session_id) as sessoes,
       count(distinct e.user_id) as usuarios_logados,
       count(*) filter (where e.name = 'page_view') as paginas_vistas,
       count(*) filter (where e.kind = 'error') as erros
from public.app_events e
where e.env = 'prod'
group by 1
order by 1 desc;

-- funil do anúncio (máquina/insumo): quantas sessões chegaram a cada etapa e quantas publicaram
create or replace view analytics.funil_anuncio as
with s as (
  select e.session_id,
         bool_or(e.name = 'anuncio_iniciado') as iniciou,
         bool_or(e.name = 'anuncio_etapa' and (e.props ->> 'etapa')::int >= 1) as chegou_detalhes,
         bool_or(e.name = 'anuncio_etapa' and (e.props ->> 'etapa')::int >= 2) as chegou_preco,
         bool_or(e.name = 'anuncio_publicado') as publicou,
         bool_or(e.name = 'anuncio_falhou') as falhou
  from public.app_events e
  where e.env = 'prod' and e.name like 'anuncio\_%'
  group by e.session_id
)
select count(*) filter (where iniciou) as iniciaram,
       count(*) filter (where chegou_detalhes) as chegaram_detalhes,
       count(*) filter (where chegou_preco) as chegaram_preco,
       count(*) filter (where publicou) as publicaram,
       count(*) filter (where falhou) as tiveram_erro
from s;

-- funil da negociação: proposta enviada -> aceita -> operação encerrada -> avaliada
create or replace view analytics.funil_negociacao as
select count(*) filter (where e.name = 'proposta_enviada') as propostas_enviadas,
       count(*) filter (where e.name = 'proposta_aceita') as propostas_aceitas,
       count(*) filter (where e.name = 'proposta_recusada') as propostas_recusadas,
       count(*) filter (where e.name = 'operacao_encerrada') as operacoes_encerradas,
       count(*) filter (where e.name = 'operacao_cancelada') as operacoes_canceladas,
       count(*) filter (where e.name = 'avaliacao_enviada') as avaliacoes
from public.app_events e
where e.env = 'prod';

-- jornada de uma sessão (filtre por session_id para ver o passo a passo de um participante)
create or replace view analytics.jornadas as
select e.session_id, e.created_at at time zone 'America/Sao_Paulo' as horario_brasilia,
       e.kind, e.name, e.route, e.props,
       e.created_at - lag(e.created_at) over (partition by e.session_id order by e.created_at) as desde_o_anterior
from public.app_events e
where e.env = 'prod';
