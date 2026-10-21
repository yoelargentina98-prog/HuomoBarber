BEGIN;
-- Local wall-clock times in America/Argentina/Buenos_Aires. Empty intervals mean off.
CREATE TABLE public.barber_schedules (
 employee_id uuid PRIMARY KEY REFERENCES public.employee_details(employee_id),
 weekly jsonb NOT NULL DEFAULT '[]',
 exceptions jsonb NOT NULL DEFAULT '[]',
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.barber_schedules FROM anon, authenticated;
GRANT SELECT ON public.barber_schedules TO authenticated;
GRANT ALL ON public.barber_schedules TO service_role;
CREATE POLICY admin_read ON public.barber_schedules FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE TRIGGER schedule_audit AFTER INSERT OR UPDATE ON public.barber_schedules
 FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();

CREATE FUNCTION public.validate_work_intervals(intervals jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; previous_end text := ''; start_time text; end_time text;
BEGIN
 IF jsonb_typeof(intervals) IS DISTINCT FROM 'array' OR jsonb_array_length(intervals)>8 THEN
  RAISE EXCEPTION 'Cada día admite hasta 8 franjas horarias.';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(intervals) ORDER BY value->>'start' LOOP
  start_time := item->>'start'; end_time := item->>'end';
  IF start_time IS NULL OR end_time IS NULL OR start_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   OR end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR start_time>=end_time THEN
   RAISE EXCEPTION 'Cada franja debe empezar antes de terminar, dentro del mismo día.';
  END IF;
  IF start_time<previous_end THEN RAISE EXCEPTION 'Las franjas de un día no pueden superponerse.'; END IF;
  previous_end := end_time;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.validate_work_intervals(jsonb) FROM PUBLIC;

CREATE FUNCTION public.save_barber_schedule(target_employee uuid, weekly_hours jsonb,
 date_exceptions jsonb, expected_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; day_number integer; seen_days integer[] := '{}'; seen_dates date[] := '{}'; work_date date; current_revision integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede configurar horarios.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.employee_details WHERE employee_id=target_employee FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_employee AND role='barber') THEN
  RAISE EXCEPTION 'Los horarios corresponden a un barbero.';
 END IF;
 SELECT revision INTO current_revision FROM public.barber_schedules WHERE employee_id=target_employee;
 IF expected_revision IS DISTINCT FROM coalesce(current_revision,0) THEN
  RAISE EXCEPTION 'Otra persona modificó estos horarios. Recargá la ficha antes de guardar.';
 END IF;
 IF jsonb_typeof(weekly_hours) IS DISTINCT FROM 'array' OR jsonb_array_length(weekly_hours)<>7 THEN
  RAISE EXCEPTION 'Configurá los siete días de la semana.';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(weekly_hours) LOOP
  IF coalesce(item->>'day','') !~ '^[0-6]$' THEN RAISE EXCEPTION 'Día semanal inválido.'; END IF;
  day_number := (item->>'day')::integer;
  IF day_number=ANY(seen_days) THEN RAISE EXCEPTION 'Día semanal repetido.'; END IF;
  seen_days := array_append(seen_days,day_number);
  PERFORM public.validate_work_intervals(item->'intervals');
 END LOOP;
 IF jsonb_typeof(date_exceptions) IS DISTINCT FROM 'array' OR jsonb_array_length(date_exceptions)>366 THEN
  RAISE EXCEPTION 'Se admiten hasta 366 excepciones por barbero.';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(date_exceptions) LOOP
  IF coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Fecha inválida.'; END IF;
  work_date := (item->>'date')::date;
  IF work_date=ANY(seen_dates) THEN RAISE EXCEPTION 'Hay fechas de excepción repetidas.'; END IF;
  seen_dates := array_append(seen_dates,work_date);
  IF length(coalesce(item->>'reason',''))>300 THEN RAISE EXCEPTION 'El motivo admite hasta 300 caracteres.'; END IF;
  PERFORM public.validate_work_intervals(item->'intervals');
 END LOOP;
 INSERT INTO public.barber_schedules(employee_id,weekly,exceptions)
 VALUES(target_employee,weekly_hours,date_exceptions)
 ON CONFLICT(employee_id) DO UPDATE SET weekly=excluded.weekly,exceptions=excluded.exceptions,
 revision=barber_schedules.revision+1,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.save_barber_schedule(uuid,jsonb,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_barber_schedule(uuid,jsonb,jsonb,integer) TO authenticated;
COMMIT;
