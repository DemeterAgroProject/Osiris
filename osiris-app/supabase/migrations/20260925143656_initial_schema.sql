-- Schema inicial do Osiris, gerado a partir do dump de 2026-09-25 14:36:56 (supabase db dump).
-- Contém apenas o schema public; dados, roles e os schemas auth/storage ficam fora do repositório.
-- O trigger em auth.users que chama public.handle_new_user() não aparece no dump do schema public.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


COMMENT ON SCHEMA "public" IS 'standard public schema';


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


CREATE OR REPLACE FUNCTION "public"."aceitar_negociacao"("neg_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_negotiation record;
  v_new_booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.';
  end if;

  select *
    into v_negotiation
  from public.negotiations
  where id = neg_id
  for update;

  if v_negotiation.id is null then
    raise exception 'Negociacao nao encontrada.';
  end if;

  if v_negotiation.provider_id is distinct from auth.uid() then
    raise exception 'Apenas o proprietario do anuncio pode aceitar esta proposta.';
  end if;

  if v_negotiation.status not in ('solicitada', 'em_negociacao') then
    raise exception 'Esta negociacao nao esta em um estado valido para ser aceita (status atual: %).', v_negotiation.status;
  end if;

  update public.negotiations
  set status = 'aceita',
      updated_at = now()
  where id = neg_id;

  insert into public.bookings (
    negotiation_id,
    provider_id,
    client_id,
    product_id,
    service_id,
    start_date,
    end_date,
    scheduled_end_at,
    total_price,
    status
  ) values (
    v_negotiation.id,
    v_negotiation.provider_id,
    v_negotiation.client_id,
    v_negotiation.product_id,
    v_negotiation.service_id,
    v_negotiation.proposed_start_date,
    v_negotiation.proposed_end_date,
    (v_negotiation.proposed_end_date + time '18:00') at time zone 'America/Sao_Paulo',
    v_negotiation.proposed_price,
    'pendente'
  )
  returning id into v_new_booking_id;

  return v_new_booking_id;
end;
$$;


ALTER FUNCTION "public"."aceitar_negociacao"("neg_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_cancellation_reason" character varying, "p_cancellation_reason_details" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.';
  end if;

  select *
    into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Operacao nao encontrada.';
  end if;

  if auth.uid() not in (v_booking.client_id, v_booking.provider_id) then
    raise exception 'Apenas participantes podem cancelar a operacao.';
  end if;

  update public.bookings
  set status = 'cancelado',
      cancellation_reason = p_cancellation_reason,
      cancellation_reason_details = p_cancellation_reason_details,
      cancelled_by = auth.uid(),
      cancelled_at = now()
  where id = p_booking_id;

  return p_booking_id;
end;
$$;


ALTER FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_cancellation_reason" character varying, "p_cancellation_reason_details" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_negotiation"("p_negotiation_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_negotiation public.negotiations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.';
  end if;

  select *
    into v_negotiation
  from public.negotiations
  where id = p_negotiation_id
  for update;

  if v_negotiation.id is null then
    raise exception 'Negociacao nao encontrada.';
  end if;

  if auth.uid() not in (v_negotiation.client_id, v_negotiation.provider_id) then
    raise exception 'Apenas participantes podem cancelar a negociacao.';
  end if;

  if v_negotiation.status not in ('solicitada', 'em_negociacao') then
    raise exception 'Somente negociacoes abertas podem ser canceladas.';
  end if;

  update public.negotiations
  set status = 'cancelado',
      updated_at = now()
  where id = p_negotiation_id;

  return p_negotiation_id;
end;
$$;


ALTER FUNCTION "public"."cancel_negotiation"("p_negotiation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" character varying, "p_body" "text", "p_link" "text", "p_related_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if p_type = 'nova_mensagem' then
    insert into public.notifications (user_id, type, title, body, link, related_id, updated_at)
    values (p_user_id, p_type, p_title, p_body, p_link, p_related_id, now())
    on conflict (user_id, related_id, type)
      where type = 'nova_mensagem' and is_read = false
    do update set
      title = excluded.title,
      body = excluded.body,
      link = excluded.link,
      updated_at = now();
  else
    insert into public.notifications (user_id, type, title, body, link, related_id)
    values (p_user_id, p_type, p_title, p_body, p_link, p_related_id);
  end if;
end;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" character varying, "p_body" "text", "p_link" "text", "p_related_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_can_offer_services"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (account_type = 'admin' or can_offer_services)
  );
$$;


ALTER FUNCTION "public"."current_user_can_offer_services"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_can_rent_out"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (account_type = 'admin' or can_rent_out)
  );
$$;


ALTER FUNCTION "public"."current_user_can_rent_out"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_type = 'admin'
  );
$$;


ALTER FUNCTION "public"."current_user_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_booking_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_recipient uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'cancelado' then
    v_recipient := case
      when new.cancelled_by = new.client_id then new.provider_id
      else new.client_id
    end;

    perform public.create_notification(
      v_recipient,
      'operacao_cancelada',
      'Operacao cancelada',
      'Sua operacao foi cancelada. Clique aqui para ver o motivo e avaliar sua experiencia com este usuario.',
      '/operacoes/' || new.id,
      new.id
    );

    return new;
  end if;

  perform public.create_notification(
    new.client_id,
    'status_reserva',
    'Status da operacao atualizado',
    'Sua operacao agora esta: ' || new.status,
    '/operacoes/' || new.id,
    new.id
  );

  perform public.create_notification(
    new.provider_id,
    'status_reserva',
    'Status da operacao atualizado',
    'A operacao agora esta: ' || new.status,
    '/operacoes/' || new.id,
    new.id
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_booking_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_negotiation_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_recipient uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('aceita', 'recusada') then
    perform public.create_notification(
      new.client_id,
      'negociacao_' || new.status,
      case when new.status = 'aceita' then 'Negociacao aceita!' else 'Negociacao recusada' end,
      case when new.status = 'aceita' then 'Sua proposta foi aceita pelo prestador.' else 'Sua proposta foi recusada.' end,
      '/negociacoes/' || new.id,
      new.id
    );
  elsif new.status = 'cancelado' then
    v_recipient := case
      when auth.uid() = new.client_id then new.provider_id
      else new.client_id
    end;

    perform public.create_notification(
      v_recipient,
      'negociacao_cancelada',
      'Negociacao cancelada',
      'Esta negociacao foi cancelada antes do aceite.',
      '/negociacoes/' || new.id,
      new.id
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_negotiation_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_negotiation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_client_name character varying;
begin
  select coalesce(p.display_name, p.email, 'Um cliente')
    into v_client_name
  from public.profiles p
  where p.id = new.client_id;

  perform public.create_notification(
    new.provider_id,
    'nova_negociacao',
    'Nova solicitacao de negociacao',
    v_client_name || ' enviou uma nova proposta.',
    '/negociacoes/' || new.id,
    new.id
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_negotiation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_negotiation_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_client_id uuid;
  v_provider_id uuid;
  v_recipient uuid;
begin
  select n.client_id, n.provider_id
    into v_client_id, v_provider_id
  from public.negotiations n
  where n.id = new.negotiation_id;

  if v_client_id is null or v_provider_id is null then
    return new;
  end if;

  v_recipient := case
    when new.sender_id = v_client_id then v_provider_id
    else v_client_id
  end;

  perform public.create_notification(
    v_recipient,
    'nova_mensagem',
    'Novas mensagens',
    'Voce tem novas mensagens nesta negociacao.',
    '/negociacoes/' || new.negotiation_id,
    new.negotiation_id
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_negotiation_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_review"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_reviewer_name character varying;
begin
  select coalesce(p.display_name, p.email, 'Alguem')
    into v_reviewer_name
  from public.profiles p
  where p.id = new.reviewer_id;

  perform public.create_notification(
    new.reviewee_id,
    'nova_avaliacao',
    'Voce recebeu uma avaliacao',
    v_reviewer_name || ' avaliou voce com ' || new.rating || ' estrelas.',
    '/perfil/' || new.reviewee_id,
    new.booking_id
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, photo_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name', -- Pega o nome do Google
    new.email,                            -- Pega o Email
    new.raw_user_meta_data->>'avatar_url',-- Pega a foto do Google
    'client'                              -- Define o tipo padrão
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_product_owner"("p_product_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = p_product_id
      AND owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_product_owner"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_account_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.account_type is distinct from old.account_type
     and not public.current_user_is_admin()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Somente administradores podem alterar account_type.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_profile_account_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_due_review_reminders"("p_now" timestamp with time zone DEFAULT "now"()) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_inserted integer;
begin
  with due as (
    select b.id as booking_id, b.client_id as user_id
    from public.bookings b
    where b.status = 'em_avaliacao'
      and b.scheduled_end_at is not null
      and p_now >= b.scheduled_end_at + interval '24 hours'
      and not exists (
        select 1
        from public.reviews r
        where r.booking_id = b.id
          and r.reviewer_id = b.client_id
      )
    union all
    select b.id as booking_id, b.provider_id as user_id
    from public.bookings b
    where b.status = 'em_avaliacao'
      and b.scheduled_end_at is not null
      and p_now >= b.scheduled_end_at + interval '24 hours'
      and not exists (
        select 1
        from public.reviews r
        where r.booking_id = b.id
          and r.reviewer_id = b.provider_id
      )
  ),
  inserted as (
    insert into public.notifications (user_id, type, title, body, link, related_id)
    select
      due.user_id,
      'solicitacao_avaliacao',
      'Avalie sua experiencia',
      'A operacao terminou. Compartilhe sua avaliacao sobre esta experiencia.',
      '/operacoes/' || due.booking_id,
      due.booking_id
    from due
    on conflict (user_id, related_id, type)
      where type = 'solicitacao_avaliacao'
    do nothing
    returning 1
  )
  select count(*) into v_inserted
  from inserted;

  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."send_due_review_reminders"("p_now" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_booking_cancellation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.status = 'cancelado' then
    if tg_op = 'UPDATE' and old.status = 'cancelado' then
      if new.status is distinct from old.status then
        raise exception 'Operacao cancelada nao pode mudar de status.';
      end if;

      if new.cancellation_reason is distinct from old.cancellation_reason
        or new.cancellation_reason_details is distinct from old.cancellation_reason_details
        or new.cancelled_by is distinct from old.cancelled_by
        or new.cancelled_at is distinct from old.cancelled_at
      then
        raise exception 'Metadados de cancelamento sao imutaveis.';
      end if;

      return new;
    end if;

    if tg_op = 'UPDATE' and old.status not in ('pendente', 'em_operacao') then
      raise exception 'Operacao no status % nao pode ser cancelada.', old.status;
    end if;

    if auth.uid() is not null and new.cancelled_by is distinct from auth.uid() then
      raise exception 'cancelled_by deve ser o usuario autenticado.';
    end if;

    if new.cancelled_by is null or new.cancelled_by not in (new.client_id, new.provider_id) then
      raise exception 'cancelled_by deve ser cliente ou prestador da operacao.';
    end if;

    if new.cancellation_reason is null then
      raise exception 'cancellation_reason e obrigatorio.';
    end if;

    if new.cancellation_reason = 'other'
      and length(trim(coalesce(new.cancellation_reason_details, ''))) < 15
    then
      raise exception 'cancellation_reason_details deve ter pelo menos 15 caracteres quando o motivo for other.';
    end if;

    if new.cancellation_reason <> 'other' then
      new.cancellation_reason_details := null;
    end if;

    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif tg_op = 'UPDATE' and old.status = 'cancelado' then
    raise exception 'Operacao cancelada nao pode mudar de status.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_booking_cancellation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_negotiation_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
    or new.provider_id is distinct from old.provider_id
    or new.product_id is distinct from old.product_id
    or new.service_id is distinct from old.service_id
  then
    raise exception 'Participantes e alvo da negociacao sao imutaveis.';
  end if;

  if old.status in ('aceita', 'recusada', 'cancelado')
    and new.status is distinct from old.status
  then
    raise exception 'Negociacao encerrada nao pode mudar de status.';
  end if;

  if new.status = 'cancelado'
    and old.status not in ('solicitada', 'em_negociacao')
  then
    raise exception 'Somente negociacoes abertas podem ser canceladas.';
  end if;

  if auth.uid() is not null
    and auth.uid() not in (old.client_id, old.provider_id)
  then
    raise exception 'Apenas participantes podem alterar a negociacao.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_negotiation_transition"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agricultural_machinery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid",
    "type_id" "uuid",
    "model" character varying(100) NOT NULL,
    "serial_number" character varying(100),
    "manufacture_year" integer,
    "current_horimeter" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "product_id" "uuid"
);


ALTER TABLE "public"."agricultural_machinery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "product_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" character varying(50) DEFAULT 'pendente'::character varying,
    "total_price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "negotiation_id" "uuid",
    "scheduled_end_at" timestamp with time zone,
    "cancellation_reason" character varying,
    "cancellation_reason_details" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "bookings_cancellation_other_details_check" CHECK (((("cancellation_reason")::"text" IS DISTINCT FROM 'other'::"text") OR ("length"(TRIM(BOTH FROM COALESCE("cancellation_reason_details", ''::"text"))) >= 15))),
    CONSTRAINT "bookings_cancellation_reason_check" CHECK ((("cancellation_reason" IS NULL) OR (("cancellation_reason")::"text" = ANY ((ARRAY['mechanical_issue'::character varying, 'weather_conditions'::character varying, 'logistical_issue'::character varying, 'operational_unavailability'::character varying, 'commercial_disagreement'::character varying, 'withdrawal'::character varying, 'other'::character varying])::"text"[])))),
    CONSTRAINT "check_dates" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "chk_booking_status" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'em_operacao'::character varying, 'em_avaliacao'::character varying, 'finalizada'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "chk_booking_target" CHECK (((("product_id" IS NOT NULL) AND ("service_id" IS NULL)) OR (("service_id" IS NOT NULL) AND ("product_id" IS NULL))))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "service_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_favorite_target" CHECK (((("product_id" IS NOT NULL) AND ("service_id" IS NULL)) OR (("product_id" IS NULL) AND ("service_id" IS NOT NULL))))
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."machinery_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."machinery_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."negotiation_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "negotiation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."negotiation_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."negotiations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "service_id" "uuid",
    "proposed_start_date" "date",
    "proposed_end_date" "date",
    "proposed_price" numeric(12,2),
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying DEFAULT 'solicitada'::character varying,
    CONSTRAINT "chk_negotiation_status" CHECK ((("status")::"text" = ANY (ARRAY[('solicitada'::character varying)::"text", ('em_negociacao'::character varying)::"text", ('aceita'::character varying)::"text", ('recusada'::character varying)::"text", ('cancelado'::character varying)::"text"]))),
    CONSTRAINT "chk_negotiation_target" CHECK (((("product_id" IS NOT NULL) AND ("service_id" IS NULL)) OR (("service_id" IS NOT NULL) AND ("product_id" IS NULL))))
);


ALTER TABLE "public"."negotiations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying NOT NULL,
    "title" character varying NOT NULL,
    "body" "text",
    "link" "text",
    "related_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "url" "text" NOT NULL,
    "is_cover" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "quantity" numeric DEFAULT 0 NOT NULL,
    "stock_unit" character varying NOT NULL,
    "category" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "price" numeric(10,2),
    "status" character varying DEFAULT 'Ativo'::character varying
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" character varying(255),
    "email" character varying(255),
    "phone_number" character varying(50),
    "photo_url" "text",
    "role" character varying(50) DEFAULT 'client'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cpf" character varying,
    "account_type" "text" DEFAULT 'cliente'::"text" NOT NULL,
    "can_rent_out" boolean DEFAULT false NOT NULL,
    "can_offer_services" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_account_type_check" CHECK (("account_type" = ANY (ARRAY['cliente'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."role" IS 'Campo legado. Novas autorizacoes usam account_type e capacidades.';


COMMENT ON COLUMN "public"."profiles"."account_type" IS 'Tipo estrutural da conta: cliente ou admin. Visitante e ausencia de sessao.';


COMMENT ON COLUMN "public"."profiles"."can_rent_out" IS 'Permite ofertar e gerenciar produtos e maquinario do inventario.';


COMMENT ON COLUMN "public"."profiles"."can_offer_services" IS 'Permite ofertar e gerenciar servicos e mao de obra.';


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewee_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "booking_id" "uuid" NOT NULL,
    CONSTRAINT "chk_not_self_review" CHECK (("reviewer_id" <> "reviewee_id")),
    CONSTRAINT "chk_rating_range" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "service_type" character varying(50) NOT NULL,
    "pricing_model" character varying(50) NOT NULL,
    "price" numeric(10,2),
    "location" character varying(255) NOT NULL,
    "status" character varying(50) DEFAULT 'ativo'::character varying,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "services_pricing_model_check" CHECK ((("pricing_model")::"text" = ANY ((ARRAY['Por Hora'::character varying, 'Por Hectare'::character varying, 'Empreitada/Fixo'::character varying, 'A Combinar'::character varying])::"text"[]))),
    CONSTRAINT "services_service_type_check" CHECK ((("service_type")::"text" = ANY ((ARRAY['Mão de Obra'::character varying, 'Pacote Completo'::character varying])::"text"[])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agricultural_machinery"
    ADD CONSTRAINT "agricultural_machinery_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."agricultural_machinery"
    ADD CONSTRAINT "agricultural_machinery_serial_number_key" UNIQUE ("serial_number");


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");


ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."machinery_types"
    ADD CONSTRAINT "machinery_types_name_key" UNIQUE ("name");


ALTER TABLE ONLY "public"."machinery_types"
    ADD CONSTRAINT "machinery_types_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."negotiation_messages"
    ADD CONSTRAINT "negotiation_messages_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."negotiations"
    ADD CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");


ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "uq_reviewer_booking" UNIQUE ("reviewer_id", "booking_id");


CREATE UNIQUE INDEX "idx_bookings_negotiation_id_unique" ON "public"."bookings" USING "btree" ("negotiation_id") WHERE ("negotiation_id" IS NOT NULL);


CREATE INDEX "idx_messages_created_at" ON "public"."negotiation_messages" USING "btree" ("created_at");


CREATE INDEX "idx_messages_negotiation_id" ON "public"."negotiation_messages" USING "btree" ("negotiation_id");


CREATE INDEX "idx_negotiations_client" ON "public"."negotiations" USING "btree" ("client_id");


CREATE INDEX "idx_negotiations_provider" ON "public"."negotiations" USING "btree" ("provider_id");


CREATE UNIQUE INDEX "idx_notifications_review_request_once" ON "public"."notifications" USING "btree" ("user_id", "related_id", "type") WHERE (("type")::"text" = 'solicitacao_avaliacao'::"text");


CREATE UNIQUE INDEX "idx_notifications_unread_message_group" ON "public"."notifications" USING "btree" ("user_id", "related_id", "type") WHERE ((("type")::"text" = 'nova_mensagem'::"text") AND ("is_read" = false));


CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");


CREATE INDEX "idx_reviews_reviewee" ON "public"."reviews" USING "btree" ("reviewee_id");


CREATE UNIQUE INDEX "unique_user_product_favorite" ON "public"."favorites" USING "btree" ("user_id", "product_id") WHERE ("product_id" IS NOT NULL);


CREATE UNIQUE INDEX "unique_user_service_favorite" ON "public"."favorites" USING "btree" ("user_id", "service_id") WHERE ("service_id" IS NOT NULL);


CREATE OR REPLACE TRIGGER "protect_profile_account_type_trigger" BEFORE UPDATE OF "account_type" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_account_type"();


-- Trigger "send-push-on-insert" (AFTER INSERT ON public.notifications) omitido de propósito:
-- ele é um Database Webhook criado pelo Dashboard e embute a service_role key no cabeçalho
-- Authorization. Recrie em Dashboard > Database > Webhooks apontando para a Edge Function send-push.


CREATE OR REPLACE TRIGGER "trg_booking_status_change" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_booking_status_change"();


CREATE OR REPLACE TRIGGER "trg_negotiation_status_change" AFTER UPDATE ON "public"."negotiations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_negotiation_status_change"();


CREATE OR REPLACE TRIGGER "trg_new_negotiation" AFTER INSERT ON "public"."negotiations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_negotiation"();


CREATE OR REPLACE TRIGGER "trg_new_negotiation_message" AFTER INSERT ON "public"."negotiation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_negotiation_message"();


CREATE OR REPLACE TRIGGER "trg_new_review" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_review"();


CREATE OR REPLACE TRIGGER "trg_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


CREATE OR REPLACE TRIGGER "trg_validate_booking_cancellation" BEFORE INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_booking_cancellation"();


CREATE OR REPLACE TRIGGER "trg_validate_negotiation_transition" BEFORE UPDATE ON "public"."negotiations" FOR EACH ROW EXECUTE FUNCTION "public"."validate_negotiation_transition"();


CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


ALTER TABLE ONLY "public"."agricultural_machinery"
    ADD CONSTRAINT "agricultural_machinery_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT;


ALTER TABLE ONLY "public"."agricultural_machinery"
    ADD CONSTRAINT "agricultural_machinery_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."agricultural_machinery"
    ADD CONSTRAINT "agricultural_machinery_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."machinery_types"("id") ON DELETE RESTRICT;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_negotiation_id_fkey" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."negotiation_messages"
    ADD CONSTRAINT "fk_negotiation" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."negotiation_messages"
    ADD CONSTRAINT "fk_sender" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."negotiations"
    ADD CONSTRAINT "negotiations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."negotiations"
    ADD CONSTRAINT "negotiations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."negotiations"
    ADD CONSTRAINT "negotiations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."negotiations"
    ADD CONSTRAINT "negotiations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id");


ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


CREATE POLICY "Administradores possuem acesso completo" ON "public"."agricultural_machinery" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."bookings" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."brands" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."favorites" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."machinery_types" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."negotiation_messages" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."negotiations" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."notifications" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."product_images" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."products" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."profiles" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."push_subscriptions" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."reviews" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Administradores possuem acesso completo" ON "public"."services" TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());


CREATE POLICY "Clientes podem iniciar uma negociação" ON "public"."negotiations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "client_id") AND ("client_id" IS NOT NULL) AND ("provider_id" IS NOT NULL) AND ("client_id" <> "provider_id") AND ((("product_id" IS NOT NULL) AND ("service_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "negotiations"."product_id") AND ("p"."owner_id" = "negotiations"."provider_id"))))) OR (("service_id" IS NOT NULL) AND ("product_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."services" "s"
  WHERE (("s"."id" = "negotiations"."service_id") AND ("s"."owner_id" = "negotiations"."provider_id"))))))));


CREATE POLICY "Donos gerenciam seus produtos" ON "public"."products" TO "authenticated" USING ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_rent_out"())) WITH CHECK ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_rent_out"()));


CREATE POLICY "Donos podem atualizar seus serviços" ON "public"."services" FOR UPDATE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_offer_services"())) WITH CHECK ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_offer_services"()));


CREATE POLICY "Donos podem atualizar suas máquinas" ON "public"."agricultural_machinery" FOR UPDATE TO "authenticated" USING (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"())) WITH CHECK (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


CREATE POLICY "Donos podem deletar seus serviços" ON "public"."services" FOR DELETE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_offer_services"()));


CREATE POLICY "Donos podem deletar suas máquinas" ON "public"."agricultural_machinery" FOR DELETE TO "authenticated" USING (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


CREATE POLICY "Leitura livre de marcas" ON "public"."brands" FOR SELECT USING (true);


CREATE POLICY "Leitura livre de tipos" ON "public"."machinery_types" FOR SELECT USING (true);


CREATE POLICY "Participantes da negociação podem ver os detalhes do produto" ON "public"."products" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."negotiations" "n"
  WHERE (("n"."product_id" = "products"."id") AND (("n"."client_id" = "auth"."uid"()) OR ("n"."provider_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."product_id" = "products"."id") AND (("b"."client_id" = "auth"."uid"()) OR ("b"."provider_id" = "auth"."uid"())))))));


CREATE POLICY "Participantes da negociação podem ver os detalhes do serviço" ON "public"."services" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."negotiations" "n"
  WHERE (("n"."service_id" = "services"."id") AND (("n"."client_id" = "auth"."uid"()) OR ("n"."provider_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."service_id" = "services"."id") AND (("b"."client_id" = "auth"."uid"()) OR ("b"."provider_id" = "auth"."uid"())))))));


CREATE POLICY "Participantes do agendamento podem ler as avaliações" ON "public"."reviews" FOR SELECT USING ((("auth"."uid"() = "reviewer_id") OR ("auth"."uid"() = "reviewee_id") OR (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "reviews"."booking_id") AND (("b"."client_id" = "auth"."uid"()) OR ("b"."provider_id" = "auth"."uid"())))))));


CREATE POLICY "Participantes podem atualizar a negociação" ON "public"."negotiations" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id"))) WITH CHECK ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));


CREATE POLICY "Participantes podem atualizar seus agendamentos" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id"))) WITH CHECK ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));


CREATE POLICY "Participantes podem avaliar operacoes avaliaveis" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "reviewer_id") AND ("reviewer_id" <> "reviewee_id") AND ("booking_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "reviews"."booking_id") AND (("b"."client_id" = "auth"."uid"()) OR ("b"."provider_id" = "auth"."uid"())) AND (("b"."status")::"text" = ANY ((ARRAY['em_avaliacao'::character varying, 'cancelado'::character varying])::"text"[])) AND ((("b"."client_id" = "auth"."uid"()) AND ("b"."provider_id" = "reviews"."reviewee_id")) OR (("b"."provider_id" = "auth"."uid"()) AND ("b"."client_id" = "reviews"."reviewee_id"))))))));


CREATE POLICY "Participantes podem enviar mensagens" ON "public"."negotiation_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."negotiations" "n"
  WHERE (("n"."id" = "negotiation_messages"."negotiation_id") AND (("n"."client_id" = "auth"."uid"()) OR ("n"."provider_id" = "auth"."uid"())) AND (("n"."status")::"text" = ANY ((ARRAY['solicitada'::character varying, 'em_negociacao'::character varying])::"text"[])))))));


CREATE POLICY "Participantes podem ler as mensagens do chat" ON "public"."negotiation_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."negotiations" "n"
  WHERE (("n"."id" = "negotiation_messages"."negotiation_id") AND (("n"."client_id" = "auth"."uid"()) OR ("n"."provider_id" = "auth"."uid"()))))));


CREATE POLICY "Participantes podem ver seus agendamentos" ON "public"."bookings" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));


CREATE POLICY "Participantes podem ver suas negociações" ON "public"."negotiations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));


CREATE POLICY "Perfis visíveis para todos" ON "public"."profiles" FOR SELECT USING (true);


CREATE POLICY "Prestador pode criar agendamento apos aceite" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "provider_id") AND (EXISTS ( SELECT 1
   FROM "public"."negotiations" "n"
  WHERE ((("n"."status")::"text" = 'aceita'::"text") AND ("n"."client_id" = "bookings"."client_id") AND ("n"."provider_id" = "bookings"."provider_id") AND ((("bookings"."negotiation_id" IS NOT NULL) AND ("n"."id" = "bookings"."negotiation_id")) OR (("bookings"."negotiation_id" IS NULL) AND (NOT ("n"."product_id" IS DISTINCT FROM "bookings"."product_id")) AND (NOT ("n"."service_id" IS DISTINCT FROM "bookings"."service_id")))))))));


CREATE POLICY "Prestadores podem deletar seus bloqueios" ON "public"."bookings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "provider_id"));


CREATE POLICY "Usuário atualiza suas próprias notificações" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));


CREATE POLICY "Usuário gerencia suas próprias inscrições" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id"));


CREATE POLICY "Usuário vê suas próprias notificações" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));


CREATE POLICY "Usuários podem adicionar aos seus favoritos" ON "public"."favorites" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


CREATE POLICY "Usuários podem atualizar o próprio perfil" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));


CREATE POLICY "Usuários podem cadastrar máquinas em seus produtos" ON "public"."agricultural_machinery" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


CREATE POLICY "Usuários podem criar serviços" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = "auth"."uid"()) AND "public"."current_user_can_offer_services"()));


CREATE POLICY "Usuários podem remover de seus favoritos" ON "public"."favorites" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


CREATE POLICY "Usuários podem ver seus próprios favoritos" ON "public"."favorites" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


CREATE POLICY "Visitantes podem ver máquinas" ON "public"."agricultural_machinery" FOR SELECT USING (true);


CREATE POLICY "Visitantes podem ver produtos" ON "public"."products" FOR SELECT USING ((("status")::"text" = 'ativo'::"text"));


CREATE POLICY "Visitantes podem ver serviços ativos" ON "public"."services" FOR SELECT USING ((("status")::"text" = 'ativo'::"text"));


ALTER TABLE "public"."agricultural_machinery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."machinery_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."negotiation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."negotiations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_delete_owner" ON "public"."product_images" FOR DELETE TO "authenticated" USING (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


CREATE POLICY "product_images_insert_owner" ON "public"."product_images" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


CREATE POLICY "product_images_select_public" ON "public"."product_images" FOR SELECT TO "authenticated", "anon" USING (true);


CREATE POLICY "product_images_update_owner" ON "public"."product_images" FOR UPDATE TO "authenticated" USING (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"())) WITH CHECK (("public"."is_product_owner"("product_id") AND "public"."current_user_can_rent_out"()));


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."negotiation_messages";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


REVOKE ALL ON FUNCTION "public"."aceitar_negociacao"("neg_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aceitar_negociacao"("neg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aceitar_negociacao"("neg_id" "uuid") TO "service_role";


REVOKE ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_cancellation_reason" character varying, "p_cancellation_reason_details" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_cancellation_reason" character varying, "p_cancellation_reason_details" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_cancellation_reason" character varying, "p_cancellation_reason_details" "text") TO "service_role";


REVOKE ALL ON FUNCTION "public"."cancel_negotiation"("p_negotiation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_negotiation"("p_negotiation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_negotiation"("p_negotiation_id" "uuid") TO "service_role";


REVOKE ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" character varying, "p_body" "text", "p_link" "text", "p_related_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" character varying, "p_body" "text", "p_link" "text", "p_related_id" "uuid") TO "service_role";


REVOKE ALL ON FUNCTION "public"."current_user_can_offer_services"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_can_offer_services"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_can_offer_services"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_can_offer_services"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."current_user_can_rent_out"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_can_rent_out"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_can_rent_out"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_can_rent_out"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."current_user_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."handle_booking_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_booking_status_change"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."handle_negotiation_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_negotiation_status_change"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."handle_new_negotiation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_negotiation"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."handle_new_negotiation_message"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_negotiation_message"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."handle_new_review"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_review"() TO "service_role";


GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."is_product_owner"("p_product_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_product_owner"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_product_owner"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_product_owner"("p_product_id" "uuid") TO "service_role";


GRANT ALL ON FUNCTION "public"."protect_profile_account_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_account_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_account_type"() TO "service_role";


GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


REVOKE ALL ON FUNCTION "public"."send_due_review_reminders"("p_now" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."send_due_review_reminders"("p_now" timestamp with time zone) TO "service_role";


GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


GRANT ALL ON FUNCTION "public"."validate_booking_cancellation"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_booking_cancellation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_booking_cancellation"() TO "service_role";


GRANT ALL ON FUNCTION "public"."validate_negotiation_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_negotiation_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_negotiation_transition"() TO "service_role";


GRANT ALL ON TABLE "public"."agricultural_machinery" TO "anon";
GRANT ALL ON TABLE "public"."agricultural_machinery" TO "authenticated";
GRANT ALL ON TABLE "public"."agricultural_machinery" TO "service_role";


GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";


GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";


GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";


GRANT ALL ON TABLE "public"."machinery_types" TO "anon";
GRANT ALL ON TABLE "public"."machinery_types" TO "authenticated";
GRANT ALL ON TABLE "public"."machinery_types" TO "service_role";


GRANT ALL ON TABLE "public"."negotiation_messages" TO "anon";
GRANT ALL ON TABLE "public"."negotiation_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."negotiation_messages" TO "service_role";


GRANT ALL ON TABLE "public"."negotiations" TO "anon";
GRANT ALL ON TABLE "public"."negotiations" TO "authenticated";
GRANT ALL ON TABLE "public"."negotiations" TO "service_role";


GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";


GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";


GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";


GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";


GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";


GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


