-- Integration checks, all writes are rolled back (including audit events).
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE employee uuid; version integer; weekly jsonb; invalid jsonb;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 IF employee IS NULL THEN RAISE EXCEPTION 'Falta un barbero para probar.'; END IF;
 SELECT coalesce((SELECT revision FROM public.barber_schedules WHERE employee_id=employee),0) INTO version;
 SELECT jsonb_agg(jsonb_build_object('day',day,'intervals',CASE WHEN day=1 THEN '[{"start":"09:00","end":"13:00"},{"start":"16:00","end":"20:00"}]'::jsonb ELSE '[]'::jsonb END)) INTO weekly FROM generate_series(0,6) day;
 PERFORM public.save_barber_schedule(employee,weekly,'[{"date":"2026-12-25","reason":"Ausencia","intervals":[]}]',version);
 IF NOT EXISTS(SELECT 1 FROM public.barber_schedules WHERE employee_id=employee AND revision=version+1) THEN RAISE EXCEPTION 'Fallo de persistencia'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.employee_audit WHERE employee_id=employee AND entity='barber_schedules') THEN RAISE EXCEPTION 'Falta auditoría'; END IF;
 BEGIN
  PERFORM public.save_barber_schedule(employee,weekly,'[]',version);
  RAISE EXCEPTION 'Se permitió escritura obsoleta' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 invalid:=jsonb_set(weekly,'{1,intervals}','[{"start":"09:00","end":"14:00"},{"start":"13:00","end":"15:00"}]');
 BEGIN
  PERFORM public.save_barber_schedule(employee,invalid,'[]',version+1);
  RAISE EXCEPTION 'Se permitieron superposiciones' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.save_barber_schedule(employee,weekly,'[{"date":"2026-12-25","intervals":[]},{"date":"2026-12-25","intervals":[]}]',version+1);
  RAISE EXCEPTION 'Se permitieron fechas duplicadas' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.save_barber_schedule(auth.uid(),weekly,'[]',0);
  RAISE EXCEPTION 'Se configuró un administrador' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 IF EXISTS(SELECT 1 FROM public.barber_schedules) THEN RAISE EXCEPTION 'El empleado leyó horarios privados'; END IF;
 BEGIN
  PERFORM public.save_barber_schedule(employee,weekly,'[]',version+1);
  RAISE EXCEPTION 'El empleado modificó horarios' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
