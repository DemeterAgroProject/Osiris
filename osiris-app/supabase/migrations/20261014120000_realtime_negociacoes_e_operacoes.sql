-- Tempo real para preço/status da negociação e status da operação.
-- Antes só negotiation_messages e notifications estavam na publicação: as telas de
-- negociação e de operação dependiam de recarregar a página para ver a mudança feita pela outra parte.
-- O Realtime aplica as policies de SELECT de cada tabela, então cada um só recebe as próprias linhas.

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'negotiations') then
    alter publication supabase_realtime add table only public.negotiations;
  end if;

  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings') then
    alter publication supabase_realtime add table only public.bookings;
  end if;
end;
$$;
