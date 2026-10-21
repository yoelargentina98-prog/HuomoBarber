BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE employee uuid; branch_a uuid; branch_b uuid; baseline record; result record; before_commission bigint; after_commission bigint;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
 SELECT * INTO baseline FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_a;
 SELECT coalesce(sum(commission_cents),0) INTO before_commission FROM public.get_branch_commissions(branch_a,'2000-01-01') WHERE employee_id=employee;
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,branch_id,branch_name,voided_at)
 VALUES(employee,'Prueba costo A','cut','2000-01-15 12:00:00+00',2000000,30,branch_a,'Irigoyen',NULL),
 (employee,'Prueba costo B','beard','2000-01-15 12:00:00+00',3000000,30,branch_b,'Mosconi',NULL),
 (employee,'Prueba costo anulado','cut','2000-01-15 12:00:00+00',9000000,30,branch_a,'Irigoyen',now());
 PERFORM set_config('role','authenticated',true);
 PERFORM public.record_branch_expense(branch_a,'rent','Alquiler prueba',200000,'2000-01-15','cash',gen_random_uuid(),'');
 PERFORM public.record_branch_expense(branch_a,'commission_payment','Pago comisión prueba',600000,'2000-01-15','transfer',gen_random_uuid(),'');
 SELECT * INTO result FROM public.get_branch_balances('2000-01-01') WHERE branch_id=branch_a;
 IF result.commission_cents<>baseline.commission_cents+600000 OR result.expense_cents<>baseline.expense_cents+200000 OR result.total_cost_cents<>baseline.total_cost_cents+800000 OR result.balance_cents<>baseline.balance_cents-800000 THEN RAISE EXCEPTION 'Comisiones duplicadas o costo incorrecto'; END IF;
 SELECT sum(commission_cents) INTO after_commission FROM public.get_branch_commissions(branch_a,'2000-01-01') WHERE employee_id=employee;
 IF after_commission<>before_commission+600000 THEN RAISE EXCEPTION 'Desglose incorrecto'; END IF;
 PERFORM public.save_employee_branch(employee,branch_b);
 IF NOT EXISTS(SELECT 1 FROM public.get_branch_commissions(branch_a,'2000-01-01') WHERE employee_id=employee AND NOT belongs_here AND commission_cents=after_commission) THEN RAISE EXCEPTION 'Se perdió histórico tras traslado'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 BEGIN
  PERFORM public.get_branch_commissions(branch_a,'2000-01-01');
  RAISE EXCEPTION 'Empleado consultó comisiones ajenas' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
