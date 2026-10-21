-- Stress pagination with >1000 receipts. No fixtures persist.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE employee uuid; branch uuid; other_branch uuid; reception uuid; admin_id uuid:=auth.uid();
 result jsonb; next_result jsonb; totals jsonb; filters jsonb;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO other_branch FROM public.branches WHERE name='Mosconi';
 SELECT id INTO reception FROM public.profiles WHERE role='reception' AND branch_id=branch LIMIT 1;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 SELECT employee,'Paging fixture '||n,'cut','1995-06-15 12:00:00+00',10000,30,branch,'Irigoyen' FROM generate_series(1,1165) n;
 INSERT INTO public.cash_payments(request_id,service_id,employee_id,barber_name,service_name,branch_id,branch_name,amount_cents,method,paid_at,recorded_by)
 SELECT gen_random_uuid(),s.id,employee,'Fixture',s.service_name,branch,'Irigoyen',10000,
 CASE WHEN substring(s.service_name FROM 16)::integer<=1105 THEN 'transfer' ELSE 'cash' END,
 '1995-06-15 13:00:00+00',admin_id FROM public.employee_services s WHERE s.service_name LIKE 'Paging fixture %';
 PERFORM set_config('role','authenticated',true);
 filters:=jsonb_build_object('day','1995-06-15','branch',branch,'method','transfer');
 result:=public.get_management_page('cash_payments',filters,0,45);
 next_result:=public.get_management_page('cash_payments',filters,1,45);
 IF (result->>'total')::integer<>1105 OR jsonb_array_length(result->'rows')<>45 OR jsonb_array_length(next_result->'rows')<>45 THEN RAISE EXCEPTION 'No se paginó el conjunto filtrado completo'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'rows') r WHERE r->>'method'<>'transfer') THEN RAISE EXCEPTION 'Se mezclaron medios'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'rows') a JOIN jsonb_array_elements(next_result->'rows') b ON a->>'id'=b->>'id') THEN RAISE EXCEPTION 'Orden inestable o páginas repetidas'; END IF;
 result:=public.get_management_page('cash_payments',filters,999,45);
 IF (result->>'page')::integer<>24 OR jsonb_array_length(result->'rows')<>25 THEN RAISE EXCEPTION 'No ajustó última página'; END IF;
 totals:=public.get_cash_day_summary('1995-06-15',branch);
 IF (totals->>'total')::bigint<>11650000 OR (totals->>'transferCount')::integer<>1105 OR (totals->>'cashCount')::integer<>60 THEN RAISE EXCEPTION 'Totales truncados por página'; END IF;
 result:=public.get_management_page('employee_services',jsonb_build_object('employee',employee,'month','1995-06-01'),0,20);
 IF jsonb_array_length(result->'rows')<>20 OR (result->>'total')::integer<>1165 THEN RAISE EXCEPTION 'Historial truncado'; END IF;
 totals:=public.get_employee_month_summary(employee,'1995-06-01');
 IF (totals->>'count')::integer<>1165 OR (totals->>'commission')::bigint<>3495000 THEN RAISE EXCEPTION 'Resumen del empleado parcial'; END IF;
 BEGIN
  PERFORM public.get_management_page('employee_services','{}',0,21);
  RAISE EXCEPTION 'Más de 20 fuera de Caja' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 BEGIN
  PERFORM public.get_management_page('cash_payments',filters,0,20);
  RAISE EXCEPTION 'Barbero leyó Caja' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.get_management_page('employee_audit',jsonb_build_object('employee',employee),0,20);
  RAISE EXCEPTION 'Barbero leyó auditoría' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF reception IS NOT NULL THEN
  PERFORM set_config('request.jwt.claim.sub',reception::text,true);
  result:=public.get_management_page('cash_payments',filters,0,45);
  IF jsonb_array_length(result->'rows')<>45 THEN RAISE EXCEPTION 'Recepción no pudo paginar su sucursal'; END IF;
  BEGIN
   PERFORM public.get_management_page('cash_payments',filters||jsonb_build_object('branch',other_branch),0,20);
   RAISE EXCEPTION 'Recepción leyó otra sucursal' USING ERRCODE='ZX001';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END IF;
END $$;
ROLLBACK;
