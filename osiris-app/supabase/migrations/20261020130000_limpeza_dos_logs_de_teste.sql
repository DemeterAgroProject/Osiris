-- Limpeza semanal dos logs que não entram na análise: eventos do desenvolvimento local (dev) e dos
-- previews da Vercel (preview) com mais de 7 dias. Os de produção (prod) ficam até o fim do projeto,
-- como diz a Política de privacidade. Ver docs/logs.md.

create or replace function public.limpar_logs_de_teste()
  returns integer
  language sql security definer
  set search_path to 'public'
  as $$
  with apagados as (
    delete from public.app_events
    where env in ('dev', 'preview') and created_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::integer from apagados;
$$;

alter function public.limpar_logs_de_teste() owner to postgres;
revoke all on function public.limpar_logs_de_teste() from public, anon, authenticated;

-- domingo, 3h (UTC); recria se já existir
select cron.unschedule(jobid) from cron.job where jobname = 'limpeza-logs-de-teste';
select cron.schedule('limpeza-logs-de-teste', '0 3 * * 0', $$select public.limpar_logs_de_teste()$$);
