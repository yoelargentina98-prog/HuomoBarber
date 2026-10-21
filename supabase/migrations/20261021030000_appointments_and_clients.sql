-- ============================================================================
-- Migración: 20261021030000_appointments_and_clients.sql
-- Proyecto: Huomo — Sistema de Gestión de Barbería
-- Propósito:
--   1. Incorporar rol 'client' al enum public.app_role.
--   2. Trigger automático para altas de clientes desde Supabase Auth (sin elevación de rol).
--   3. Políticas RLS para lectura pública/cliente de sucursales, servicios y barberos.
--   4. Tabla public.booking_settings para reglas de reserva configurables.
--   5. Tipo public.appointment_status y tabla public.appointments con snapshots y exclusión GiST.
--   6. Funciones RPC atómicas: cálculo de turnos disponibles, reserva, cancelación y reprogramación.
--   7. Vinculación de turnos completados con employee_services.
-- ============================================================================

-- 1. Incorporar 'client' al enum public.app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
COMMIT;

BEGIN;

-- 2. Trigger en auth.users para crear automáticamente perfiles de cliente
CREATE OR REPLACE FUNCTION public.handle_new_client_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  v_name := btrim(coalesce(NEW.raw_user_meta_data->>'full_name', ''));
  v_phone := btrim(coalesce(NEW.raw_user_meta_data->>'phone', ''));

  INSERT INTO public.profiles (id, role, full_name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    'client'::public.app_role,
    CASE WHEN v_name <> '' THEN v_name ELSE split_part(coalesce(NEW.email, 'Cliente'), '@', 1) END,
    v_phone,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_client_user();

-- 3. Actualizar políticas de lectura para que clientes y personal puedan consultar sucursales y servicios activos
DROP POLICY IF EXISTS admin_read ON public.branches;
DROP POLICY IF EXISTS branches_read_policy ON public.branches;
CREATE POLICY branches_read_policy ON public.branches
  FOR SELECT TO authenticated
  USING (active = true OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS admin_read ON public.service_catalog;
DROP POLICY IF EXISTS service_catalog_read_policy ON public.service_catalog;
CREATE POLICY service_catalog_read_policy ON public.service_catalog
  FOR SELECT TO authenticated
  USING (active = true OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS admin_read ON public.branch_services;
DROP POLICY IF EXISTS branch_services_read_policy ON public.branch_services;
CREATE POLICY branch_services_read_policy ON public.branch_services
  FOR SELECT TO authenticated
  USING ((active = true AND price_cents IS NOT NULL) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS admin_read ON public.barber_services;
DROP POLICY IF EXISTS barber_services_read_policy ON public.barber_services;
CREATE POLICY barber_services_read_policy ON public.barber_services
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR employee_id = auth.uid());

-- 4. Función segura para listar barberos asignados a una sucursal y servicio sin exponer datos privados
CREATE OR REPLACE FUNCTION public.get_public_barbers_by_branch_and_service(
  target_branch uuid,
  target_service uuid
)
RETURNS TABLE (
  barber_id uuid,
  barber_name text,
  branch_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS barber_id,
    coalesce(nullif(btrim(p.full_name), ''), p.username, 'Barbero')::text AS barber_name,
    p.branch_id
  FROM public.profiles p
  JOIN public.employee_details ed ON ed.employee_id = p.id
  JOIN public.barber_services bs ON bs.employee_id = p.id
  WHERE p.role = 'barber'
    AND p.branch_id = target_branch
    AND ed.active = true
    AND bs.service_id = target_service
  ORDER BY p.full_name, p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_barbers_by_branch_and_service(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_barbers_by_branch_and_service(uuid, uuid) TO authenticated;

-- 5. Tabla de Reglas de Reserva Configurables (booking_settings)
CREATE TABLE IF NOT EXISTS public.booking_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  min_advance_hours integer NOT NULL DEFAULT 2 CHECK (min_advance_hours >= 0 AND min_advance_hours <= 168),
  max_future_days integer NOT NULL DEFAULT 30 CHECK (max_future_days >= 1 AND max_future_days <= 180),
  cancel_limit_hours integer NOT NULL DEFAULT 2 CHECK (cancel_limit_hours >= 0 AND cancel_limit_hours <= 168),
  max_active_per_client integer NOT NULL DEFAULT 3 CHECK (max_active_per_client >= 1 AND max_active_per_client <= 20),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.booking_settings (id, min_advance_hours, max_future_days, cancel_limit_hours, max_active_per_client)
VALUES (true, 2, 30, 2, 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_settings FROM anon, authenticated;
GRANT SELECT ON public.booking_settings TO anon, authenticated;
GRANT UPDATE ON public.booking_settings TO authenticated;
GRANT ALL ON public.booking_settings TO service_role;

DROP POLICY IF EXISTS booking_settings_read ON public.booking_settings;
CREATE POLICY booking_settings_read ON public.booking_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS booking_settings_admin_update ON public.booking_settings;
CREATE POLICY booking_settings_admin_update ON public.booking_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 6. Función para actualizar reglas de reserva desde administración
CREATE OR REPLACE FUNCTION public.save_booking_settings(
  p_min_advance_hours integer,
  p_max_future_days integer,
  p_cancel_limit_hours integer,
  p_max_active_per_client integer
)
RETURNS public.booking_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result public.booking_settings;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administración puede modificar las reglas de reserva.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.booking_settings
  SET
    min_advance_hours = p_min_advance_hours,
    max_future_days = p_max_future_days,
    cancel_limit_hours = p_cancel_limit_hours,
    max_active_per_client = p_max_active_per_client,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = true
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_booking_settings(integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_booking_settings(integer, integer, integer, integer) TO authenticated;

-- 7. Modelo de Turnos (public.appointments)
DO $$
BEGIN
  IF to_regtype('public.appointment_status') IS NULL THEN
    CREATE TYPE public.appointment_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name text NOT NULL CHECK (length(btrim(client_name)) BETWEEN 2 AND 100),
  client_phone text NOT NULL DEFAULT '' CHECK (length(client_phone) <= 30),
  client_email text NOT NULL DEFAULT '' CHECK (length(client_email) <= 100),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  barber_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'confirmed',
  -- Instantáneas históricas (Snapshots)
  branch_name text NOT NULL,
  barber_name text NOT NULL,
  service_name text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  -- Auditoría y ciclo de vida
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  cancellation_reason text DEFAULT NULL CHECK (cancellation_reason IS NULL OR length(cancellation_reason) <= 500),
  cancelled_at timestamptz DEFAULT NULL,
  cancelled_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_valid_range CHECK (starts_at < ends_at),
  CONSTRAINT no_overlapping_confirmed_appointments EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'confirmed')
);

CREATE INDEX IF NOT EXISTS appointments_client_idx ON public.appointments(client_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS appointments_barber_idx ON public.appointments(barber_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_branch_idx ON public.appointments(branch_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON public.appointments(status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointments FROM anon, authenticated;
GRANT SELECT ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

DROP POLICY IF EXISTS appointments_read_policy ON public.appointments;
CREATE POLICY appointments_read_policy ON public.appointments
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR (client_id = auth.uid())
    OR (barber_id = auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'reception'
          AND p.branch_id = public.appointments.branch_id
      )
    )
  );

-- 8. Vinculación de turnos con employee_services
ALTER TABLE public.employee_services ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employee_services_active_appointment ON public.employee_services(appointment_id) WHERE voided_at IS NULL;

-- 9. Función RPC: Calcular disponibilidad de horarios (slots) en el servidor
CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_branch_id uuid,
  p_service_id uuid,
  p_barber_id uuid,
  p_target_date date
)
RETURNS TABLE (
  starts_at timestamptz,
  ends_at timestamptz,
  time_display text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings public.booking_settings;
  v_duration integer;
  v_min_time timestamptz;
  v_max_date date;
  v_schedule public.barber_schedules;
  v_intervals jsonb;
  v_exc jsonb;
  v_dow integer;
  v_day_record jsonb;
  v_interval_rec jsonb;
  v_int_start text;
  v_int_end text;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_cursor_time time;
  v_end_time time;
  v_step_interval interval;
  v_tz text := 'America/Argentina/Buenos_Aires';
BEGIN
  SELECT * INTO v_settings FROM public.booking_settings WHERE id = true;
  IF v_settings.id IS NULL THEN
    v_settings.min_advance_hours := 2;
    v_settings.max_future_days := 30;
  END IF;

  -- Validar horizonte de reserva
  v_min_time := now() + (v_settings.min_advance_hours || ' hours')::interval;
  v_max_date := (now() AT TIME ZONE v_tz)::date + v_settings.max_future_days;

  IF p_target_date < (now() AT TIME ZONE v_tz)::date OR p_target_date > v_max_date THEN
    RETURN;
  END IF;

  -- Obtener duración del servicio
  SELECT duration_minutes INTO v_duration
  FROM public.service_catalog
  WHERE id = p_service_id AND active = true;

  IF v_duration IS NULL OR v_duration <= 0 THEN
    RETURN;
  END IF;

  v_step_interval := (v_duration || ' minutes')::interval;

  -- Obtener horarios del barbero
  SELECT * INTO v_schedule FROM public.barber_schedules WHERE employee_id = p_barber_id;
  IF v_schedule.employee_id IS NULL THEN
    RETURN; -- Sin horarios configurados
  END IF;

  -- Comprobar si hay excepción para esta fecha
  v_intervals := NULL;
  FOR v_exc IN SELECT * FROM jsonb_array_elements(v_schedule.exceptions) LOOP
    IF (v_exc->>'date') = p_target_date::text THEN
      v_intervals := v_exc->'intervals';
      EXIT;
    END IF;
  END LOOP;

  -- Si no hay excepción, buscar en la grilla semanal
  IF v_intervals IS NULL THEN
    v_dow := extract(dow FROM p_target_date)::integer;
    FOR v_day_record IN SELECT * FROM jsonb_array_elements(v_schedule.weekly) LOOP
      IF (v_day_record->>'day')::integer = v_dow THEN
        v_intervals := v_day_record->'intervals';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_intervals IS NULL OR jsonb_typeof(v_intervals) <> 'array' OR jsonb_array_length(v_intervals) = 0 THEN
    RETURN; -- Día no laborable
  END IF;

  -- Iterar por cada franja horaria configurada
  FOR v_interval_rec IN SELECT * FROM jsonb_array_elements(v_intervals) LOOP
    v_int_start := v_interval_rec->>'start';
    v_int_end := v_interval_rec->>'end';

    v_cursor_time := v_int_start::time;
    v_end_time := v_int_end::time;

    -- Generar slots candidatos
    WHILE (v_cursor_time + (v_duration || ' minutes')::interval) <= v_end_time LOOP
      v_slot_start := (p_target_date || ' ' || to_char(v_cursor_time, 'HH24:MI:SS'))::timestamp AT TIME ZONE v_tz;
      v_slot_end := v_slot_start + v_step_interval;

      -- Verificar anticipación mínima
      IF v_slot_start >= v_min_time THEN
        -- Verificar que no haya superposición con ningún turno confirmado existente
        IF NOT EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.barber_id = p_barber_id
            AND a.status = 'confirmed'
            AND tstzrange(a.starts_at, a.ends_at) && tstzrange(v_slot_start, v_slot_end)
        ) THEN
          starts_at := v_slot_start;
          ends_at := v_slot_end;
          time_display := to_char(v_slot_start AT TIME ZONE v_tz, 'HH24:MI');
          RETURN NEXT;
        END IF;
      END IF;

      -- Avanzar al siguiente bloque
      v_cursor_time := (v_cursor_time + (v_duration || ' minutes')::interval)::time;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_booking_slots(uuid, uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_booking_slots(uuid, uuid, uuid, date) TO authenticated, anon;

-- 10. Función RPC Atómica: Reservar Turno (book_appointment)
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_branch_id uuid,
  p_service_id uuid,
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text DEFAULT '',
  p_client_email text DEFAULT '',
  p_notes text DEFAULT ''
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings public.booking_settings;
  v_user_id uuid;
  v_user_role public.app_role;
  v_is_staff boolean := false;
  v_branch_name text;
  v_barber_name text;
  v_service_name text;
  v_price_cents bigint;
  v_duration integer;
  v_ends_at timestamptz;
  v_active_count integer;
  v_min_time timestamptz;
  v_max_date date;
  v_target_date date;
  v_tz text := 'America/Argentina/Buenos_Aires';
  v_slot_valid boolean := false;
  v_slot record;
  v_result public.appointments;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_role IN ('admin', 'reception') THEN
      v_is_staff := true;
    END IF;
  END IF;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin','reception','client') THEN
    RAISE EXCEPTION 'Esta cuenta no puede crear reservas.' USING ERRCODE='42501';
  END IF;
  IF v_user_role='reception' AND NOT public.can_access_cash_branch(p_branch_id) THEN
    RAISE EXCEPTION 'Recepción debe estar activa y pertenecer a la sucursal.' USING ERRCODE='42501';
  END IF;
  IF v_user_role='client' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-client:'||v_user_id::text,0));
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-branch:'||p_branch_id::text,0));
  -- 1. Validación de reglas de reserva
  SELECT * INTO v_settings FROM public.booking_settings WHERE id = true;
  IF v_settings.id IS NULL THEN
    v_settings.min_advance_hours := 2;
    v_settings.max_future_days := 30;
    v_settings.cancel_limit_hours := 2;
    v_settings.max_active_per_client := 3;
  END IF;

  v_target_date := (p_starts_at AT TIME ZONE v_tz)::date;
  v_min_time := now() + (v_settings.min_advance_hours || ' hours')::interval;
  v_max_date := (now() AT TIME ZONE v_tz)::date + v_settings.max_future_days;

  -- Si es un cliente común, aplicar restricciones de anticipación y horizonte
  IF NOT v_is_staff THEN
    IF p_starts_at < v_min_time THEN
      RAISE EXCEPTION 'El turno requiere al menos % horas de anticipación.', v_settings.min_advance_hours;
    END IF;
    IF v_target_date > v_max_date THEN
      RAISE EXCEPTION 'Solo podés reservar con hasta % días de anticipación.', v_settings.max_future_days;
    END IF;

    -- Validar límite de reservas activas por cliente autenticado
    IF v_user_id IS NOT NULL THEN
      SELECT count(*) INTO v_active_count
      FROM public.appointments
      WHERE client_id = v_user_id
        AND status = 'confirmed'
        AND ends_at > now();

      IF v_active_count >= v_settings.max_active_per_client THEN
        RAISE EXCEPTION 'Tenés el máximo permitido de % turnos activos. Podés reservar otro una vez completados.', v_settings.max_active_per_client;
      END IF;
    END IF;
  END IF;

  -- 2. Validar sucursal activa
  SELECT name INTO v_branch_name FROM public.branches WHERE id = p_branch_id AND active = true;
  IF v_branch_name IS NULL THEN
    RAISE EXCEPTION 'La sucursal seleccionada no existe o está inactiva.';
  END IF;

  -- Si es recepcionista, validar que pertenezca a la sucursal del turno
  IF v_user_role = 'reception' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = v_user_id AND branch_id = p_branch_id
    ) THEN
      RAISE EXCEPTION 'No tenés permisos para gestionar turnos de otra sucursal.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. Validar barbero activo y asignado a la sucursal
  SELECT coalesce(nullif(btrim(p.full_name), ''), p.username, 'Barbero') INTO v_barber_name
  FROM public.profiles p
  JOIN public.employee_details ed ON ed.employee_id = p.id
  WHERE p.id = p_barber_id
    AND p.role = 'barber'
    AND p.branch_id = p_branch_id
    AND ed.active = true;

  IF v_barber_name IS NULL THEN
    RAISE EXCEPTION 'El barbero seleccionado no está disponible en esta sucursal.';
  END IF;

  -- 4. Validar servicio habilitado con precio para esta sucursal y barbero
  SELECT s.name, s.duration_minutes, bs.price_cents
  INTO v_service_name, v_duration, v_price_cents
  FROM public.service_catalog s
  JOIN public.branch_services bs ON bs.service_id = s.id AND bs.branch_id = p_branch_id
  JOIN public.barber_services bar ON bar.service_id = s.id AND bar.employee_id = p_barber_id
  WHERE s.id = p_service_id
    AND s.active = true
    AND bs.active = true
    AND bs.price_cents IS NOT NULL;

  IF v_service_name IS NULL THEN
    RAISE EXCEPTION 'El servicio no está habilitado para este barbero en esta sucursal.';
  END IF;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  -- 5. Bloqueo transaccional consultivo para serializar reservas sobre el mismo barbero
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_barber_id::text, 0));

  -- 6. Verificar que el horario esté dentro de los slots disponibles calculados
  FOR v_slot IN SELECT starts_at, ends_at FROM public.get_available_booking_slots(p_branch_id, p_service_id, p_barber_id, v_target_date) LOOP
    IF v_slot.starts_at = p_starts_at THEN
      v_slot_valid := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_slot_valid THEN
    RAISE EXCEPTION 'El horario seleccionado ya no está disponible. Por favor elegí otro.';
  END IF;

  -- 7. Insertar el turno con sus instantáneas históricas
  INSERT INTO public.appointments (
    client_id,
    client_name,
    client_phone,
    client_email,
    branch_id,
    barber_id,
    service_id,
    starts_at,
    ends_at,
    status,
    branch_name,
    barber_name,
    service_name,
    price_cents,
    duration_minutes,
    notes,
    created_by
  )
  VALUES (
    CASE WHEN v_user_role='client' THEN v_user_id ELSE NULL END,
    btrim(p_client_name),
    btrim(p_client_phone),
    btrim(p_client_email),
    p_branch_id,
    p_barber_id,
    p_service_id,
    p_starts_at,
    v_ends_at,
    'confirmed',
    v_branch_name,
    v_barber_name,
    v_service_name,
    v_price_cents,
    v_duration,
    coalesce(p_notes, ''),
    v_user_id
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text) TO authenticated;

-- 11. Función RPC: Cancelar Turno (cancel_appointment)
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id uuid,
  p_reason text DEFAULT ''
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_appt public.appointments;
  v_settings public.booking_settings;
  v_min_cancel_time timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida para cancelar turnos.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'El turno no existe.';
  END IF;

  IF v_appt.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Solo podés cancelar turnos en estado confirmado.';
  END IF;

  -- Si es cliente, validar que sea su propio turno y cumpla el límite horario
  IF v_user_role = 'client' OR v_user_role IS NULL THEN
    IF v_appt.client_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'No podés cancelar el turno de otro cliente.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_settings FROM public.booking_settings WHERE id = true;
    v_min_cancel_time := now() + (v_settings.cancel_limit_hours || ' hours')::interval;

    IF v_appt.starts_at < v_min_cancel_time THEN
      RAISE EXCEPTION 'Solo se puede cancelar con al menos % horas de anticipación.', v_settings.cancel_limit_hours;
    END IF;
  ELSIF v_user_role = 'reception' THEN
    IF NOT public.can_access_cash_branch(v_appt.branch_id) THEN
      RAISE EXCEPTION 'No podés cancelar turnos de otra sucursal.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_user_role <> 'admin' THEN
    RAISE EXCEPTION 'No tenés permisos para cancelar este turno.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.appointments
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancellation_reason = coalesce(nullif(btrim(p_reason), ''), 'Cancelado por el usuario'),
    updated_at = now()
  WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO authenticated;

-- 12. Función RPC Atómica: Reprogramar Turno (reschedule_appointment)
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_user_role public.app_role;
  v_appt public.appointments;
  v_settings public.booking_settings;
  v_new_ends_at timestamptz;
  v_min_cancel_time timestamptz;
  v_target_date date;
  v_slot_valid boolean := false;
  v_slot record;
  v_tz text := 'America/Argentina/Buenos_Aires';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida para reprogramar turnos.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'El turno no existe.';
  END IF;

  IF v_appt.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Solo podés reprogramar turnos en estado confirmado.';
  END IF;

  -- Validar permisos y límite horario
  SELECT * INTO v_settings FROM public.booking_settings WHERE id = true;
  IF v_user_role = 'client' OR v_user_role IS NULL THEN
    IF v_appt.client_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'No podés reprogramar el turno de otro cliente.' USING ERRCODE = '42501';
    END IF;

    v_min_cancel_time := now() + (v_settings.cancel_limit_hours || ' hours')::interval;
    IF v_appt.starts_at < v_min_cancel_time THEN
      RAISE EXCEPTION 'Solo podés reprogramar con al menos % horas de anticipación.', v_settings.cancel_limit_hours;
    END IF;
  ELSIF v_user_role = 'reception' THEN
    IF NOT public.can_access_cash_branch(v_appt.branch_id) THEN
      RAISE EXCEPTION 'No podés reprogramar turnos de otra sucursal.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_user_role <> 'admin' THEN
    RAISE EXCEPTION 'No tenés permisos para reprogramar este turno.' USING ERRCODE = '42501';
  END IF;

  -- Bloqueo consultivo sobre el barbero
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_appt.barber_id::text, 0));

  v_target_date := (p_new_starts_at AT TIME ZONE v_tz)::date;
  v_new_ends_at := p_new_starts_at + (v_appt.duration_minutes || ' minutes')::interval;

  -- Comprobar disponibilidad en el nuevo horario
  FOR v_slot IN SELECT starts_at, ends_at FROM public.get_available_booking_slots(v_appt.branch_id, v_appt.service_id, v_appt.barber_id, v_target_date) LOOP
    IF v_slot.starts_at = p_new_starts_at THEN
      v_slot_valid := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_slot_valid THEN
    RAISE EXCEPTION 'El nuevo horario seleccionado no está disponible.';
  END IF;

  UPDATE public.appointments
  SET
    starts_at = p_new_starts_at,
    ends_at = v_new_ends_at,
    updated_at = now()
  WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_appointment(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, timestamptz) TO authenticated;

-- 13. Función RPC: Completar Turno y Asentar Atención en Caja (complete_appointment_service)
CREATE OR REPLACE FUNCTION public.complete_appointment_service(
  p_appointment_id uuid,
  p_payment_method text DEFAULT NULL,
  p_payment_reference text DEFAULT '',
  p_sale_notes text DEFAULT '',
  p_operation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role public.app_role;
  v_appt public.appointments;
  v_config public.employee_compensation;
  v_job_id uuid;
  v_receipt_id uuid := NULL;
  v_service_time timestamptz := now();
  v_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'reception') THEN
    RAISE EXCEPTION 'Solo administración y recepción pueden asentar la atención de turnos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'El turno no existe.';
  END IF;

  IF v_appt.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Solo turnos confirmados pueden marcarse como completados.';
  END IF;

  IF v_user_role = 'reception' AND NOT public.can_access_cash_branch(v_appt.branch_id) THEN
    RAISE EXCEPTION 'No podés gestionar turnos de otra sucursal.' USING ERRCODE = '42501';
  END IF;

  -- Verificar si ya se registró este servicio
  IF EXISTS (SELECT 1 FROM public.employee_services WHERE appointment_id = p_appointment_id AND voided_at IS NULL) THEN
    RAISE EXCEPTION 'Este turno ya tiene un servicio asentado en el sistema.';
  END IF;

  -- Obtener compensación vigente del barbero para calcular la comisión una sola vez
  SELECT * INTO v_config FROM public.employee_compensation
  WHERE employee_id = v_appt.barber_id
    AND effective_from <= (v_service_time AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_config.id IS NULL THEN
    RAISE EXCEPTION 'Configurá la remuneración vigente del barbero antes de asentar el servicio.';
  END IF;

  -- 1. Insertar en employee_services vinculando el appointment_id
  INSERT INTO public.employee_services (
    employee_id,
    service_id,
    service_name,
    category,
    performed_at,
    amount_cents,
    commission_percent,
    notes,
    recorded_by,
    branch_id,
    branch_name,
    appointment_id
  )
  VALUES (
    v_appt.barber_id,
    v_appt.service_id,
    v_appt.service_name,
    (SELECT category FROM public.service_catalog WHERE id=v_appt.service_id),
    v_service_time,
    v_appt.price_cents,
    v_config.commission_percent,
    coalesce(nullif(btrim(p_sale_notes), ''), v_appt.notes),
    v_user_id,
    v_appt.branch_id,
    v_appt.branch_name,
    p_appointment_id
  )
  RETURNING id INTO v_job_id;

  -- 2. Si se especificó medio de pago (efectivo o transferencia), registrar cobro en caja
  IF p_payment_method IS NOT NULL AND p_payment_method IN ('cash', 'transfer') THEN
    IF p_operation_id IS NULL THEN
      p_operation_id := gen_random_uuid();
    END IF;

    v_payload := jsonb_build_object(
      'branch', v_appt.branch_id,
      'employee', v_appt.barber_id,
      'service', v_appt.service_id,
      'method', p_payment_method,
      'amount', v_appt.price_cents,
      'appointment', p_appointment_id
    );

    INSERT INTO public.cash_payments (
      request_id,
      service_id,
      employee_id,
      branch_id,
      branch_name,
      barber_name,
      service_name,
      amount_cents,
      method,
      paid_at,
      reference,
      notes,
      recorded_by,
      sale_payload
    )
    VALUES (
      p_operation_id,
      v_job_id,
      v_appt.barber_id,
      v_appt.branch_id,
      v_appt.branch_name,
      v_appt.barber_name,
      v_appt.service_name,
      v_appt.price_cents,
      p_payment_method,
      v_service_time,
      coalesce(p_payment_reference, ''),
      coalesce(p_sale_notes, ''),
      v_user_id,
      v_payload
    )
    RETURNING id INTO v_receipt_id;
  END IF;

  -- 3. Actualizar estado del turno a completado
  UPDATE public.appointments
  SET
    status = 'completed',
    updated_at = now()
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'appointmentId', p_appointment_id,
    'serviceId', v_job_id,
    'receiptId', v_receipt_id,
    'status', 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_appointment_service(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_appointment_service(uuid, text, text, text, uuid) TO authenticated;

COMMIT;
