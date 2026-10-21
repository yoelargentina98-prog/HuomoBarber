-- All fixtures, receipts and audit events are rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE employee uuid; branch uuid; job uuid; second_job uuid; receipt uuid; other_receipt uuid; operation uuid:=gen_random_uuid(); paid_at timestamptz:='2000-01-03 12:00:00+00';
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch FROM public.branches WHERE name='Irigoyen';
 IF employee IS NULL OR branch IS NULL THEN RAISE EXCEPTION 'Faltan datos de prueba'; END IF;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 VALUES(employee,'Prueba caja efectivo','cut',paid_at-interval '1 hour',2000000,30,branch,'Irigoyen') RETURNING id INTO job;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 VALUES(employee,'Prueba caja transferencia','beard',paid_at-interval '1 hour',1000000,30,branch,'Irigoyen') RETURNING id INTO second_job;
 PERFORM set_config('role','authenticated',true);
 IF NOT EXISTS(SELECT 1 FROM public.get_pending_cash_services('2000-01-03',branch) WHERE id=job) THEN RAISE EXCEPTION 'No apareció pendiente'; END IF;
 receipt:=public.collect_service_payment(job,'cash',paid_at,operation,'','Prueba no persistir');
 IF receipt IS DISTINCT FROM public.collect_service_payment(job,'cash',paid_at,operation,'','Prueba no persistir') THEN RAISE EXCEPTION 'Falló idempotencia'; END IF;
 IF (SELECT count(*) FROM public.cash_payments WHERE service_id=job)<>1 THEN RAISE EXCEPTION 'Se duplicó cobro'; END IF;
 IF (SELECT amount_cents FROM public.cash_payments WHERE id=receipt)<>2000000 THEN RAISE EXCEPTION 'Importe distinto del servicio'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_pending_cash_services('2000-01-03',branch) WHERE id=job) THEN RAISE EXCEPTION 'Cobro sigue pendiente'; END IF;
 BEGIN
  PERFORM public.collect_service_payment(job,'transfer',paid_at,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Se cobró dos veces' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.void_employee_entry('service',job,'Prueba pagado');
  RAISE EXCEPTION 'Se anuló servicio pagado' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.collect_service_payment(second_job,'card',paid_at,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Se permitió otro medio' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.collect_service_payment(second_job,'transfer',now()+interval '1 day',gen_random_uuid(),'','');
  RAISE EXCEPTION 'Se permitió pago futuro' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 other_receipt:=public.collect_service_payment(second_job,'transfer',paid_at,gen_random_uuid(),'Comprobante prueba','');
 IF (SELECT method FROM public.cash_payments WHERE id=other_receipt)<>'transfer' THEN RAISE EXCEPTION 'Medio incorrecto'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.employee_audit WHERE employee_id=employee AND entity='cash_payments') THEN RAISE EXCEPTION 'Falta auditoría'; END IF;
 PERFORM public.void_cash_payment(receipt,'Error en medio de pago');
 IF NOT EXISTS(SELECT 1 FROM public.get_pending_cash_services('2000-01-03',branch) WHERE id=job) THEN RAISE EXCEPTION 'No se recuperó pendiente'; END IF;
 PERFORM public.collect_service_payment(job,'transfer',paid_at,gen_random_uuid(),'Corregido','');
 IF (SELECT count(*) FROM public.cash_payments WHERE service_id=job)<>2 THEN RAISE EXCEPTION 'Se perdió historial'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 IF EXISTS(SELECT 1 FROM public.cash_payments) THEN RAISE EXCEPTION 'Empleado leyó caja'; END IF;
 BEGIN
  PERFORM public.collect_service_payment(job,'cash',paid_at,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Empleado cobró' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.void_cash_payment(other_receipt,'Prueba permisos');
  RAISE EXCEPTION 'Empleado anuló' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
