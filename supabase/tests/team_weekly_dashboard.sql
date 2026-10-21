-- Uses existing accounts, creates only transactional fixtures. Leaves no test activity.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE employee uuid; branch_a uuid; branch_b uuid; baseline record; actual record;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
 IF employee IS NULL OR branch_a IS NULL OR branch_b IS NULL THEN RAISE EXCEPTION 'Faltan datos para probar'; END IF;
 SELECT coalesce(sum(service_count),0) AS count,coalesce(sum(revenue_cents),0) AS revenue,coalesce(sum(commission_cents),0) AS commission
 INTO baseline FROM public.get_team_weekly_stats('2000-01-03',branch_a) WHERE employee_id=employee;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,voided_at)
 SELECT employee,'Prueba dashboard','cut',ts,10000,30,branch_a,voided FROM (VALUES
  ('2000-01-03 02:59:59+00'::timestamptz,NULL::timestamptz),
  ('2000-01-03 03:00:00+00'::timestamptz,NULL::timestamptz),
  ('2000-01-10 02:59:59+00'::timestamptz,NULL::timestamptz),
  ('2000-01-10 03:00:00+00'::timestamptz,NULL::timestamptz),
  ('2000-01-05 12:00:00+00'::timestamptz,now())) AS fixture(ts,voided);
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id)
 VALUES(employee,'Prueba otra sucursal','beard','2000-01-05 12:00:00+00',50000,30,branch_b);
 PERFORM set_config('role','authenticated',true);
 SELECT * INTO actual FROM public.get_team_weekly_stats('2000-01-03',branch_a) WHERE employee_id=employee;
 IF actual.service_count<>baseline.count+2 OR actual.revenue_cents<>baseline.revenue+20000 OR actual.commission_cents<>baseline.commission+6000 THEN
  RAISE EXCEPTION 'Fallaron límites de semana, filtro de sucursal, anulaciones o suma';
 END IF;
 BEGIN
  PERFORM public.get_team_weekly_stats('2000-01-04',NULL);
  RAISE EXCEPTION 'Se aceptó un martes' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 BEGIN
  PERFORM public.get_team_weekly_stats('2000-01-03',NULL);
  RAISE EXCEPTION 'Se permitió consulta de empleado' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
