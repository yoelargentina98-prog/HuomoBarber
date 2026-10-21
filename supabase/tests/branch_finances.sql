BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE employee uuid; branch_a uuid; branch_b uuid; first_job uuid; second_job uuid; outside_job uuid;
 expense uuid; operation uuid:=gen_random_uuid(); baseline_a record; baseline_b record; result record;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
 SELECT * INTO baseline_a FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_a;
 SELECT * INTO baseline_b FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_b;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 VALUES(employee,'Prueba balance A','cut','1999-12-31 12:00:00+00',2000000,30,branch_a,'Irigoyen') RETURNING id INTO first_job;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 VALUES(employee,'Prueba balance B','cut','1999-12-31 12:00:00+00',1000000,30,branch_b,'Mosconi') RETURNING id INTO second_job;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name)
 VALUES(employee,'Prueba siguiente mes','cut','1999-12-31 12:00:00+00',9000000,30,branch_a,'Irigoyen') RETURNING id INTO outside_job;
 PERFORM set_config('role','authenticated',true);
 PERFORM public.collect_service_payment(first_job,'cash','2000-01-01 03:00:00+00',gen_random_uuid(),'','');
 PERFORM public.collect_service_payment(second_job,'transfer','2000-02-01 02:59:59+00',gen_random_uuid(),'','');
 PERFORM public.collect_service_payment(outside_job,'cash','2000-02-01 03:00:00+00',gen_random_uuid(),'','');
 expense:=public.record_branch_expense(branch_a,'rent','Alquiler prueba',2500000,'2000-01-15','transfer',operation,'');
 IF expense IS DISTINCT FROM public.record_branch_expense(branch_a,'rent','Alquiler prueba',2500000,'2000-01-15','transfer',operation,'') THEN RAISE EXCEPTION 'Falló idempotencia'; END IF;
 SELECT * INTO result FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_a;
 IF result.income_cents<>baseline_a.income_cents+2000000 OR result.expense_cents<>baseline_a.expense_cents+2500000 OR result.balance_cents<>baseline_a.balance_cents-500000 THEN RAISE EXCEPTION 'Saldo A incorrecto'; END IF;
 SELECT * INTO result FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_b;
 IF result.income_cents<>baseline_b.income_cents+1000000 THEN RAISE EXCEPTION 'Límite mes o sucursal incorrecto'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branch_expense_audit WHERE expense_id=expense AND action='INSERT') THEN RAISE EXCEPTION 'Falta auditoría'; END IF;
 BEGIN
  PERFORM public.record_branch_expense(branch_a,'water','Prueba futura',100,((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+1),'cash',gen_random_uuid(),'');
  RAISE EXCEPTION 'Se aceptó gasto futuro' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 PERFORM public.void_branch_expense(expense,'Registro duplicado prueba');
 SELECT * INTO result FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_a;
 IF result.expense_cents<>baseline_a.expense_cents THEN RAISE EXCEPTION 'Gasto anulado sumó'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branch_expense_audit WHERE expense_id=expense AND action='UPDATE') THEN RAISE EXCEPTION 'Falta auditoría anulación'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 IF EXISTS(SELECT 1 FROM public.branch_expenses) THEN RAISE EXCEPTION 'Empleado leyó gastos'; END IF;
 BEGIN
  PERFORM public.get_branch_balances('2000-01-01');
  RAISE EXCEPTION 'Empleado leyó balances' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.record_branch_expense(branch_a,'water','Prueba sin permiso',100,'2000-01-15','cash',gen_random_uuid(),'');
  RAISE EXCEPTION 'Empleado creó gasto' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
