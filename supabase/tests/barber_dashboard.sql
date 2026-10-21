BEGIN;
DO $$
DECLARE employee uuid; other_employee uuid:=gen_random_uuid(); branch uuid; catalog uuid; empty_catalog uuid;
 start_day date:=date_trunc('week',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
 month_day date:=date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
 before_data jsonb; after_data jsonb;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch FROM public.branches WHERE name='Irigoyen';
 IF employee IS NULL THEN RAISE EXCEPTION 'Falta barbero para probar'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 before_data:=public.get_barber_dashboard(start_day);
 INSERT INTO auth.users(id,email) VALUES(other_employee,other_employee::text||'@test.invalid');
 INSERT INTO public.profiles(id,role,branch_id,full_name) VALUES(other_employee,'barber',branch,'Otro barbero prueba');
 INSERT INTO public.service_catalog(name,category,duration_minutes) VALUES('Prueba dashboard '||gen_random_uuid(),'cut',30) RETURNING id INTO catalog;
 INSERT INTO public.service_catalog(name,category,duration_minutes) VALUES('Prueba sin trabajos '||gen_random_uuid(),'other',30) RETURNING id INTO empty_catalog;
 INSERT INTO public.barber_services(employee_id,service_id) VALUES(employee,catalog),(employee,empty_catalog);
 INSERT INTO public.employee_services(employee_id,service_id,service_name,category,performed_at,amount_cents,commission_percent,voided_at)
 VALUES(employee,catalog,'Prueba propio','cut',(start_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'),2000000,30,NULL),
 (employee,NULL,'Histórico no asignado','other',(start_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'),1000000,30,NULL),
 (employee,catalog,'Prueba anulado','cut',(start_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'),9000000,30,now()),
 (other_employee,catalog,'Trabajo AJENO','cut',(start_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'),9000000,30,NULL);
 INSERT INTO public.employee_compensation(employee_id,effective_from,commission_percent,monthly_fixed_cents)
 VALUES(employee,month_day,30,25000000) ON CONFLICT(employee_id,effective_from) DO UPDATE SET monthly_fixed_cents=25000000;
 PERFORM set_config('role','authenticated',true);
 after_data:=public.get_barber_dashboard(start_day);
 IF (after_data->>'count')::bigint<>(before_data->>'count')::bigint+2 THEN RAISE EXCEPTION 'Conteo incorrecto'; END IF;
 IF (after_data->>'commission')::bigint<>(before_data->>'commission')::bigint+900000 THEN RAISE EXCEPTION 'Comisión incorrecta'; END IF;
 IF (after_data->>'revenue')::bigint<>(before_data->>'revenue')::bigint+3000000 THEN RAISE EXCEPTION 'Producción incorrecta'; END IF;
 IF (after_data->>'fixed')::bigint<>25000000 THEN RAISE EXCEPTION 'Fijo incorrecto'; END IF;
 IF after_data::text LIKE '%Trabajo AJENO%' OR after_data::text LIKE '%Prueba anulado%' THEN RAISE EXCEPTION 'Se filtró historial ajeno o anulado'; END IF;
 IF jsonb_array_length(after_data->'days')<>7 THEN RAISE EXCEPTION 'Faltan días'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(after_data->'services') x WHERE x->>'key'=empty_catalog::text AND (x->>'count')::integer=0) THEN RAISE EXCEPTION 'Falta servicio asignado sin actividad'; END IF;
 PERFORM set_config('request.jwt.claim.sub',other_employee::text,true);
 after_data:=public.get_barber_dashboard(start_day);
 IF (after_data->>'count')::integer<>1 OR (after_data->>'commission')::bigint<>2700000 THEN RAISE EXCEPTION 'No se aisló segundo barbero'; END IF;
 PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
 -- Profile RLS does not expose admin rows to a barber; use an unrelated UUID as guest.
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN
  PERFORM public.get_barber_dashboard(start_day);
  RAISE EXCEPTION 'Se permitió acceso ajeno' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
