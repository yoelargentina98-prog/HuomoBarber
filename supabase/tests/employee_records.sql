-- Prueba de integración: usa un administrador y barbero existentes.
-- TODOS los cambios se revierten. No crea cuentas ni deja importes de prueba.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE employee uuid; service uuid; adjustment uuid; stored bigint; cut_id uuid; beard_id uuid; other_id uuid; branch_a uuid; branch_b uuid; moved_service uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Falta un administrador para probar.'; END IF;
  SELECT p.id INTO employee FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id WHERE p.role='barber' AND d.active LIMIT 1;
  IF employee IS NULL THEN RAISE EXCEPTION 'Falta un barbero activo para probar.'; END IF;
  SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
  SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
  PERFORM public.save_employee_branch(employee,branch_a);
  INSERT INTO public.employee_compensation(employee_id,effective_from,commission_percent,cut_percent,monthly_fixed_cents)
    VALUES(employee,date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,25.50,90,100000)
    ON CONFLICT(employee_id,effective_from) DO UPDATE SET commission_percent=25.50, cut_percent=90;
  INSERT INTO public.service_catalog(name,category,price_cents,duration_minutes) VALUES('Prueba corte '||gen_random_uuid(),'cut',12345,30) RETURNING id INTO cut_id;
  INSERT INTO public.service_catalog(name,category,price_cents,duration_minutes) VALUES('Prueba barba '||gen_random_uuid(),'beard',12345,20) RETURNING id INTO beard_id;
  INSERT INTO public.service_catalog(name,category,price_cents,duration_minutes) VALUES('Prueba otro '||gen_random_uuid(),'other',12345,15) RETURNING id INTO other_id;
  PERFORM public.save_service_branch_prices(cut_id,jsonb_build_array(jsonb_build_object('branch_id',branch_a,'price_cents',12345,'active',true),jsonb_build_object('branch_id',branch_b,'price_cents',20000,'active',true)));
  PERFORM public.save_service_branch_prices(beard_id,jsonb_build_array(jsonb_build_object('branch_id',branch_a,'price_cents',12345,'active',true)));
  PERFORM public.save_service_branch_prices(other_id,jsonb_build_array(jsonb_build_object('branch_id',branch_a,'price_cents',12345,'active',true)));
  PERFORM public.set_barber_services(employee,ARRAY[cut_id,beard_id,other_id]);
  service := public.record_catalog_service(employee,cut_id,now()-interval '1 minute',12345,'No persistir');
  SELECT commission_cents INTO stored FROM public.employee_services WHERE id=service;
  IF stored <> 3148 THEN RAISE EXCEPTION 'Redondeo incorrecto: %', stored; END IF;
  PERFORM public.record_catalog_service(employee,beard_id,now()-interval '1 minute',12345,'No persistir');
  PERFORM public.record_catalog_service(employee,other_id,now()-interval '1 minute',12345,'No persistir');
  IF EXISTS(SELECT 1 FROM public.employee_services WHERE employee_id=employee AND notes='No persistir' AND (commission_percent<>25.50 OR commission_cents<>3148)) THEN RAISE EXCEPTION 'La comisión varió por categoría.'; END IF;
  BEGIN
    PERFORM public.set_barber_services(employee,ARRAY[gen_random_uuid()]);
    RAISE EXCEPTION 'Se asignó un servicio inexistente.' USING ERRCODE='ZX001';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  IF (SELECT branch_id FROM public.employee_services WHERE id=service)<>branch_a THEN RAISE EXCEPTION 'No se conservó la sucursal original.'; END IF;
  PERFORM public.save_employee_branch(employee,branch_b);
  IF EXISTS(SELECT 1 FROM public.barber_services WHERE employee_id=employee AND service_id=beard_id) THEN RAISE EXCEPTION 'Se conservó un servicio no disponible en destino.'; END IF;
  moved_service:=public.record_catalog_service(employee,cut_id,now()-interval '1 minute',20000,'Prueba traslado');
  IF (SELECT commission_cents FROM public.employee_services WHERE id=moved_service)<>5100 THEN RAISE EXCEPTION 'Comisión incorrecta con precio de otra sucursal.'; END IF;
  IF (SELECT branch_id FROM public.employee_services WHERE id=moved_service)<>branch_b THEN RAISE EXCEPTION 'Sucursal de destino incorrecta.'; END IF;
  PERFORM public.save_employee_branch(employee,branch_a);
  PERFORM public.set_barber_services(employee,ARRAY[cut_id,beard_id,other_id]);
  UPDATE public.service_catalog SET name='Renombrado '||gen_random_uuid(),price_cents=99999 WHERE id=cut_id;
  IF (SELECT amount_cents FROM public.employee_services WHERE id=service)<>12345 THEN RAISE EXCEPTION 'Cambió el precio histórico.'; END IF;
  UPDATE public.service_catalog SET active=false WHERE id=cut_id;
  BEGIN
    PERFORM public.record_catalog_service(employee,cut_id,now()-interval '1 minute',12345,'No persistir');
    RAISE EXCEPTION 'Se registró un servicio inactivo.' USING ERRCODE='ZX001';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  PERFORM public.set_barber_services(employee,ARRAY[]::uuid[]);
  BEGIN
    PERFORM public.set_barber_services(employee,ARRAY[cut_id]);
    RAISE EXCEPTION 'Se asignó un servicio inactivo nuevo.' USING ERRCODE='ZX001';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    PERFORM public.set_barber_services(auth.uid(),ARRAY[beard_id]);
    RAISE EXCEPTION 'Se asignaron servicios a un administrador.' USING ERRCODE='ZX001';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    PERFORM public.record_catalog_service(employee,beard_id,now()-interval '1 minute',12345,'No persistir');
    RAISE EXCEPTION 'Se registró un servicio no asignado.' USING ERRCODE='ZX001';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.employee_audit WHERE employee_id=employee AND entity='barber_services' AND action='DELETE') THEN RAISE EXCEPTION 'Falta auditoría de asignaciones.'; END IF;
  UPDATE public.employee_compensation SET commission_percent=60 WHERE employee_id=employee;
  IF (SELECT commission_percent FROM public.employee_services WHERE id=service) <> 25.50 THEN RAISE EXCEPTION 'La comisión histórica cambió.'; END IF;
  adjustment := public.record_employee_adjustment(employee,date_trunc('month',now())::date,'bonus',10000,'Prueba sin persistencia');
  PERFORM public.void_employee_entry('adjustment',adjustment,'Anulación de prueba');
  IF NOT EXISTS(SELECT 1 FROM public.employee_adjustments WHERE id=adjustment AND voided_at IS NOT NULL) THEN RAISE EXCEPTION 'No se anuló el movimiento.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.employee_audit WHERE employee_id=employee AND actor_id=auth.uid() AND entity='employee_services') THEN RAISE EXCEPTION 'Falta auditoría del administrador.'; END IF;
  BEGIN
    UPDATE public.employee_compensation SET commission_percent=101 WHERE employee_id=employee;
    RAISE EXCEPTION 'Se aceptó comisión superior al 100%%.';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM public.profiles WHERE role='barber' LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.employee_compensation) THEN RAISE EXCEPTION 'Un barbero pudo leer remuneraciones.'; END IF;
  IF EXISTS(SELECT 1 FROM public.employee_audit) THEN RAISE EXCEPTION 'Un barbero pudo leer auditoría.'; END IF;
  BEGIN
    PERFORM public.record_catalog_service(auth.uid(),gen_random_uuid(),now(),100,'');
    RAISE EXCEPTION 'Un barbero pudo registrar un servicio administrativo.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.employee_details SET active=false WHERE employee_id=auth.uid();
    RAISE EXCEPTION 'Un barbero pudo cambiar su estado.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.employee_services SET commission_percent=100;
    RAISE EXCEPTION 'Se pudo editar directamente una comisión histórica.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;
DO $$ DECLARE administrator uuid; employee uuid; BEGIN
  SELECT id INTO administrator FROM public.profiles WHERE role='admin' LIMIT 1;
  SELECT id INTO employee FROM public.profiles WHERE role='barber' LIMIT 1;
  PERFORM public.set_employee_access(employee,false,administrator);
  IF (SELECT active FROM public.employee_details WHERE employee_id=employee) THEN RAISE EXCEPTION 'No se guardó el estado de acceso.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.employee_audit WHERE employee_id=employee AND actor_id=administrator AND entity='employee_details') THEN RAISE EXCEPTION 'Falta auditoría del cambio de estado.'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.employee_compensation LIMIT 1;
    RAISE EXCEPTION 'Acceso anónimo a remuneraciones.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'Comisiones, redondeo, auditoría, anulaciones y permisos verificados; cambios revertidos.' AS result;


