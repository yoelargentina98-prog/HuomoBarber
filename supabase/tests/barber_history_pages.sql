BEGIN;
DO $$
DECLARE employee uuid; baseline bigint; first_page jsonb; second_page jsonb;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 IF employee IS NULL THEN RAISE EXCEPTION 'Falta barbero para probar'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 baseline:=(public.get_barber_service_history('2000-01-03',0)->>'total')::bigint;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent)
 SELECT employee,'Prueba historial completo '||n,'cut','2000-01-03 03:00:00+00'::timestamptz+n*interval '1 minute',2000000,30 FROM generate_series(1,25) n;
 PERFORM set_config('role','authenticated',true);
 first_page:=public.get_barber_service_history('2000-01-03',0);
 second_page:=public.get_barber_service_history('2000-01-03',1);
 IF (first_page->>'total')::bigint<>baseline+25 THEN RAISE EXCEPTION 'Historial truncado'; END IF;
 IF jsonb_array_length(first_page->'items')<>20 OR jsonb_array_length(second_page->'items')<>least(20,baseline+5) THEN RAISE EXCEPTION 'Paginación incorrecta'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'items') a JOIN jsonb_array_elements(second_page->'items') b ON a->>'id'=b->>'id') THEN RAISE EXCEPTION 'Páginas duplicadas'; END IF;
 BEGIN
  PERFORM public.get_barber_service_history('2000-01-03',-1);
  RAISE EXCEPTION 'Página negativa permitida' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN
  PERFORM public.get_barber_service_history('2000-01-03',0);
  RAISE EXCEPTION 'Identidad ajena permitida' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
