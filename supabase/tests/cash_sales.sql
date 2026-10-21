BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE admin_id uuid:=auth.uid(); receptionist uuid:=gen_random_uuid(); employee uuid; branch_a uuid; branch_b uuid; service uuid; receipt uuid; operation uuid:=gen_random_uuid(); baseline bigint; job uuid;
BEGIN
 SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
 SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
 IF employee IS NULL THEN RAISE EXCEPTION 'Falta barbero'; END IF;
 INSERT INTO auth.users(id,email) VALUES(receptionist,receptionist::text||'@test.invalid');
 INSERT INTO public.profiles(id,role,branch_id,full_name) VALUES(receptionist,'reception',branch_a,'Prueba recepción');
 PERFORM public.save_employee_branch(employee,branch_a);
 INSERT INTO public.employee_compensation(employee_id,effective_from,commission_percent,monthly_fixed_cents)
 VALUES(employee,date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,30,0)
 ON CONFLICT(employee_id,effective_from) DO UPDATE SET commission_percent=30;
 INSERT INTO public.service_catalog(name,category,duration_minutes) VALUES('Prueba venta '||gen_random_uuid(),'cut',30) RETURNING id INTO service;
 PERFORM public.save_service_branch_prices(service,jsonb_build_array(jsonb_build_object('branch_id',branch_a,'price_cents',2000000,'active',true),jsonb_build_object('branch_id',branch_b,'price_cents',3000000,'active',true)));
 INSERT INTO public.barber_services(employee_id,service_id) VALUES(employee,service);
 PERFORM set_config('role','authenticated',true);
 SELECT count(*) INTO baseline FROM public.employee_services WHERE employee_id=employee;
 BEGIN
  PERFORM public.register_cash_sale(branch_a,employee,service,'cash',1,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Se manipuló precio' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF (SELECT count(*) FROM public.employee_services WHERE employee_id=employee)<>baseline THEN RAISE EXCEPTION 'Se creó trabajo sin cobro'; END IF;
 receipt:=public.register_cash_sale(branch_a,employee,service,'cash',2000000,operation,'','');
 IF receipt IS DISTINCT FROM public.register_cash_sale(branch_a,employee,service,'cash',2000000,operation,'','') THEN RAISE EXCEPTION 'Idempotencia falló'; END IF;
 SELECT service_id INTO job FROM public.cash_payments WHERE id=receipt;
 IF (SELECT commission_cents FROM public.employee_services WHERE id=job)<>600000 THEN RAISE EXCEPTION 'Comisión incorrecta'; END IF;
 PERFORM set_config('request.jwt.claim.sub',receptionist::text,true);
 IF (public.get_cash_operator()->>'branchId')::uuid<>branch_a THEN RAISE EXCEPTION 'Sucursal incorrecta'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.get_cash_sale_options(branch_a) WHERE service_id=service) THEN RAISE EXCEPTION 'Faltan opciones de la sucursal'; END IF;
 PERFORM public.register_cash_sale(branch_a,employee,service,'transfer',2000000,gen_random_uuid(),'REF prueba','');
 BEGIN
  PERFORM public.register_cash_sale(branch_b,employee,service,'cash',3000000,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Recepción vendió en otra sucursal' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.get_cash_sale_options(branch_b);
  RAISE EXCEPTION 'Recepción consultó otra sucursal' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.get_pending_cash_services(current_date,branch_b);
  RAISE EXCEPTION 'Recepción consultó pendientes ajenos' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.void_cash_payment(receipt,'Prueba permisos');
  RAISE EXCEPTION 'Recepción anuló cobro' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 PERFORM public.save_employee_branch(receptionist,branch_b);
 PERFORM set_config('request.jwt.claim.sub',receptionist::text,true);
 IF EXISTS(SELECT 1 FROM public.cash_payments WHERE branch_id=branch_a) THEN RAISE EXCEPTION 'RLS expuso otra caja'; END IF;
 PERFORM set_config('request.jwt.claim.sub',employee::text,true);
 BEGIN
  PERFORM public.register_cash_sale(branch_a,employee,service,'cash',2000000,gen_random_uuid(),'','');
  RAISE EXCEPTION 'Barbero vendió' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
