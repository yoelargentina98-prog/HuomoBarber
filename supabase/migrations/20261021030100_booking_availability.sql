BEGIN;
CREATE TABLE public.branch_schedules (
 branch_id uuid PRIMARY KEY REFERENCES public.branches(id), weekly jsonb NOT NULL DEFAULT '[]',
 exceptions jsonb NOT NULL DEFAULT '[]', revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branch_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.branch_schedules FROM anon,authenticated;
GRANT SELECT ON public.branch_schedules TO authenticated;
CREATE POLICY admin_read ON public.branch_schedules FOR SELECT TO authenticated USING(public.is_admin());
GRANT ALL ON public.branch_schedules TO service_role;

CREATE FUNCTION public.save_branch_schedule(target_branch uuid,weekly_hours jsonb,date_exceptions jsonb,expected_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; seen text[]:='{}'; current_revision integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración configura la apertura.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.branches WHERE id=target_branch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sucursal inexistente.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-branch:'||target_branch::text,0));
 SELECT revision INTO current_revision FROM public.branch_schedules WHERE branch_id=target_branch;
 IF expected_revision IS DISTINCT FROM coalesce(current_revision,0) THEN RAISE EXCEPTION 'Los horarios cambiaron. Recargá antes de guardar.'; END IF;
 IF jsonb_typeof(weekly_hours) IS DISTINCT FROM 'array' OR jsonb_array_length(weekly_hours)<>7 THEN RAISE EXCEPTION 'Configurá los siete días.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(weekly_hours) LOOP
  IF coalesce(item->>'day','') !~ '^[0-6]$' OR item->>'day'=ANY(seen) THEN RAISE EXCEPTION 'Día inválido o repetido.'; END IF;
  seen:=array_append(seen,item->>'day'); PERFORM public.validate_work_intervals(item->'intervals');
 END LOOP;
 seen:='{}';
 IF jsonb_typeof(date_exceptions) IS DISTINCT FROM 'array' OR jsonb_array_length(date_exceptions)>366 THEN RAISE EXCEPTION 'Excepciones inválidas.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(date_exceptions) LOOP
  IF coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR item->>'date'=ANY(seen) OR length(coalesce(item->>'reason',''))>300 THEN RAISE EXCEPTION 'Excepción inválida o repetida.'; END IF;
  PERFORM (item->>'date')::date; seen:=array_append(seen,item->>'date'); PERFORM public.validate_work_intervals(item->'intervals');
 END LOOP;
 INSERT INTO public.branch_schedules(branch_id,weekly,exceptions) VALUES(target_branch,weekly_hours,date_exceptions)
 ON CONFLICT(branch_id) DO UPDATE SET weekly=excluded.weekly,exceptions=excluded.exceptions,revision=branch_schedules.revision+1,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.save_branch_schedule(uuid,jsonb,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_branch_schedule(uuid,jsonb,jsonb,integer) TO authenticated;

CREATE TABLE public.booking_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), branch_id uuid NOT NULL REFERENCES public.branches(id),
 barber_id uuid REFERENCES public.profiles(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 300), created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), removed_at timestamptz, removed_by uuid REFERENCES auth.users(id), CHECK(starts_at<ends_at)
);
ALTER TABLE public.booking_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_blocks FROM anon,authenticated;
GRANT SELECT ON public.booking_blocks TO authenticated;
GRANT ALL ON public.booking_blocks TO service_role;
CREATE POLICY scoped_read ON public.booking_blocks FOR SELECT TO authenticated USING(public.can_access_cash_branch(branch_id));
CREATE INDEX booking_blocks_window ON public.booking_blocks(branch_id,starts_at,ends_at) WHERE removed_at IS NULL;
CREATE FUNCTION public.save_booking_block(target_branch uuid,target_barber uuid,block_start timestamptz,block_end timestamptz,block_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
 IF NOT public.can_access_cash_branch(target_branch) THEN RAISE EXCEPTION 'Sin acceso a esta sucursal.' USING ERRCODE='42501'; END IF;
 IF block_start IS NULL OR block_end IS NULL OR block_start>=block_end THEN RAISE EXCEPTION 'El fin debe ser posterior al inicio.'; END IF;
 IF target_barber IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_barber AND role='barber' AND branch_id=target_branch) THEN RAISE EXCEPTION 'El barbero no pertenece a la sucursal.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-branch:'||target_branch::text,0));
 IF EXISTS(SELECT 1 FROM public.appointments a WHERE a.branch_id=target_branch AND (target_barber IS NULL OR a.barber_id=target_barber) AND a.status='confirmed' AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(block_start,block_end,'[)')) THEN RAISE EXCEPTION 'Hay turnos confirmados en ese período. Reprogramalos o cancelalos primero.'; END IF;
 INSERT INTO public.booking_blocks(branch_id,barber_id,starts_at,ends_at,reason,created_by) VALUES(target_branch,target_barber,block_start,block_end,btrim(block_reason),auth.uid()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.remove_booking_block(target_block uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.booking_blocks;
BEGIN
 SELECT * INTO b FROM public.booking_blocks WHERE id=target_block;
 IF b.id IS NULL OR NOT public.can_access_cash_branch(b.branch_id) THEN RAISE EXCEPTION 'Sin acceso al bloqueo.' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-branch:'||b.branch_id::text,0));
 UPDATE public.booking_blocks SET removed_at=now(),removed_by=auth.uid() WHERE id=target_block AND removed_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.save_booking_block(uuid,uuid,timestamptz,timestamptz,text),public.remove_booking_block(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_booking_block(uuid,uuid,timestamptz,timestamptz,text),public.remove_booking_block(uuid) TO authenticated;

CREATE FUNCTION public.booking_day_intervals(weekly jsonb,exceptions jsonb,target_date date) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce((SELECT e->'intervals' FROM jsonb_array_elements(exceptions) e WHERE e->>'date'=target_date::text LIMIT 1),
 (SELECT d->'intervals' FROM jsonb_array_elements(weekly) d WHERE (d->>'day')::integer=extract(dow FROM target_date)::integer LIMIT 1),'[]'::jsonb);
$$;
CREATE FUNCTION public.booking_window_available(target_branch uuid,target_barber uuid,target_service uuid,slot_start timestamptz,slot_minutes integer,exclude_appointment uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE local_start timestamp; local_end timestamp; day_date date; employee public.barber_schedules; branch public.branch_schedules;
 employee_intervals jsonb; branch_intervals jsonb; settings public.booking_settings; staff boolean;
BEGIN
 IF slot_start IS NULL OR slot_minutes IS NULL OR slot_minutes<1 OR slot_minutes>480 THEN RETURN false; END IF;
 local_start:=slot_start AT TIME ZONE 'America/Argentina/Buenos_Aires'; local_end:=local_start+make_interval(mins=>slot_minutes); day_date:=local_start::date;
 SELECT * INTO settings FROM public.booking_settings WHERE id;
 staff:=public.is_admin() OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='reception' AND public.can_access_cash_branch(target_branch));
 IF slot_start<now()+make_interval(hours=>CASE WHEN staff THEN 0 ELSE settings.min_advance_hours END) OR day_date>(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+settings.max_future_days OR local_end::date<>day_date THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branches b JOIN public.profiles p ON p.branch_id=b.id JOIN public.employee_details d ON d.employee_id=p.id JOIN public.barber_services a ON a.employee_id=p.id JOIN public.service_catalog s ON s.id=a.service_id JOIN public.branch_services bs ON bs.branch_id=b.id AND bs.service_id=s.id WHERE b.id=target_branch AND b.active AND p.id=target_barber AND p.role='barber' AND d.active AND s.id=target_service AND s.active AND bs.active AND bs.price_cents>0) THEN RETURN false; END IF;
 SELECT * INTO employee FROM public.barber_schedules WHERE employee_id=target_barber;
 SELECT * INTO branch FROM public.branch_schedules WHERE branch_id=target_branch;
 IF employee.employee_id IS NULL OR branch.branch_id IS NULL THEN RETURN false; END IF;
 employee_intervals:=public.booking_day_intervals(employee.weekly,employee.exceptions,day_date);
 branch_intervals:=public.booking_day_intervals(branch.weekly,branch.exceptions,day_date);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(employee_intervals) i WHERE local_start>=day_date+(i->>'start')::time AND local_end<=day_date+(i->>'end')::time AND mod(extract(epoch FROM (local_start-(day_date+(i->>'start')::time)))::numeric,slot_minutes*60)=0) THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(branch_intervals) i WHERE local_start>=day_date+(i->>'start')::time AND local_end<=day_date+(i->>'end')::time) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.booking_blocks b WHERE b.branch_id=target_branch AND b.removed_at IS NULL AND (b.barber_id IS NULL OR b.barber_id=target_barber) AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(slot_start,slot_start+make_interval(mins=>slot_minutes),'[)')) THEN RETURN false; END IF;
 RETURN NOT EXISTS(SELECT 1 FROM public.appointments a WHERE a.barber_id=target_barber AND a.status IN ('confirmed','completed') AND a.id IS DISTINCT FROM exclude_appointment AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(slot_start,slot_start+make_interval(mins=>slot_minutes),'[)'));
END $$;
REVOKE ALL ON FUNCTION public.booking_day_intervals(jsonb,jsonb,date),public.booking_window_available(uuid,uuid,uuid,timestamptz,integer,uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_available_booking_slots(p_branch_id uuid,p_service_id uuid,p_barber_id uuid,p_target_date date)
RETURNS TABLE(starts_at timestamptz,ends_at timestamptz,time_display text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE schedule public.barber_schedules; minutes integer; intervals jsonb; i jsonb; candidate timestamp;
BEGIN
 IF p_target_date IS NULL OR p_target_date<(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date OR p_target_date>(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+180 THEN RETURN; END IF;
 SELECT duration_minutes INTO minutes FROM public.service_catalog WHERE id=p_service_id AND active;
 IF minutes IS NULL OR minutes<1 THEN RETURN; END IF;
 SELECT * INTO schedule FROM public.barber_schedules WHERE employee_id=p_barber_id;
 IF schedule.employee_id IS NULL THEN RETURN; END IF;
 intervals:=public.booking_day_intervals(schedule.weekly,schedule.exceptions,p_target_date);
 FOR i IN SELECT value FROM jsonb_array_elements(intervals) ORDER BY value->>'start' LOOP
  FOR candidate IN SELECT * FROM generate_series(p_target_date+(i->>'start')::time,p_target_date+(i->>'end')::time-make_interval(mins=>minutes),make_interval(mins=>minutes)) LOOP
   starts_at:=candidate AT TIME ZONE 'America/Argentina/Buenos_Aires'; ends_at:=starts_at+make_interval(mins=>minutes);
   IF public.booking_window_available(p_branch_id,p_barber_id,p_service_id,starts_at,minutes) THEN time_display:=to_char(candidate,'HH24:MI'); RETURN NEXT; END IF;
  END LOOP;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_appointment(p_appointment_id uuid,p_new_starts_at timestamptz)
RETURNS public.appointments LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments; role public.app_role; settings public.booking_settings;
BEGIN
 SELECT p.role INTO role FROM public.profiles p WHERE p.id=auth.uid();
 IF role IS NULL OR role NOT IN ('admin','reception','client') THEN RAISE EXCEPTION 'Sin permisos para reprogramar.' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
 IF a.id IS NULL OR a.status<>'confirmed' THEN RAISE EXCEPTION 'El turno debe estar confirmado.'; END IF;
 IF role='client' THEN
  SELECT * INTO settings FROM public.booking_settings WHERE id;
  IF a.client_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'No es tu turno.' USING ERRCODE='42501'; END IF;
  IF a.starts_at<now()+make_interval(hours=>settings.cancel_limit_hours) THEN RAISE EXCEPTION 'Se superó el plazo para reprogramar.'; END IF;
 ELSIF role='reception' AND NOT public.can_access_cash_branch(a.branch_id) THEN RAISE EXCEPTION 'Sin acceso a la sucursal.' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-branch:'||a.branch_id::text,0));
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a.barber_id::text,0));
 IF NOT public.booking_window_available(a.branch_id,a.barber_id,a.service_id,p_new_starts_at,a.duration_minutes,a.id) THEN RAISE EXCEPTION 'El nuevo horario no está disponible.'; END IF;
 UPDATE public.appointments SET starts_at=p_new_starts_at,ends_at=p_new_starts_at+make_interval(mins=>a.duration_minutes),updated_at=now() WHERE id=a.id RETURNING * INTO a;
 RETURN a;
END $$;
-- A completed service still occupies its historical interval.
ALTER TABLE public.appointments DROP CONSTRAINT no_overlapping_confirmed_appointments;
ALTER TABLE public.appointments ADD CONSTRAINT no_overlapping_confirmed_appointments EXCLUDE USING gist(barber_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('confirmed','completed'));
CREATE FUNCTION public.is_active_booking_barber() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id WHERE p.id=auth.uid() AND p.role='barber' AND d.active); $$;
REVOKE ALL ON FUNCTION public.is_active_booking_barber() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_booking_barber() TO authenticated;
DROP POLICY appointments_read_policy ON public.appointments;
CREATE POLICY appointments_read_policy ON public.appointments FOR SELECT TO authenticated USING(
 public.is_admin() OR client_id=auth.uid() OR (barber_id=auth.uid() AND public.is_active_booking_barber()) OR
 EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='reception' AND public.can_access_cash_branch(appointments.branch_id)));
-- Preserve normal role protection and close direct employee branch reassignment.
CREATE FUNCTION public.protect_profile_scope() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.branch_id IS DISTINCT FROM OLD.branch_id AND current_user NOT IN ('postgres','service_role') AND NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración asigna sucursales.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER profile_scope_guard BEFORE UPDATE OF branch_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_scope();
COMMIT;

