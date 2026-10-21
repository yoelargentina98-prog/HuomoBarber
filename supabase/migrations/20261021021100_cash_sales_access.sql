BEGIN;
CREATE FUNCTION public.can_access_cash_branch(target_branch uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.is_admin() OR EXISTS(SELECT 1 FROM public.profiles p
 JOIN public.employee_details d ON d.employee_id=p.id JOIN public.branches b ON b.id=p.branch_id
 WHERE p.id=auth.uid() AND p.role='reception' AND d.active AND b.active AND p.branch_id=target_branch);
$$;
REVOKE ALL ON FUNCTION public.can_access_cash_branch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_cash_branch(uuid) TO authenticated;
CREATE POLICY reception_branch_read ON public.cash_payments FOR SELECT TO authenticated
 USING (public.can_access_cash_branch(branch_id));

CREATE FUNCTION public.get_cash_operator() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE profile public.profiles; branch public.branches;
BEGIN
 SELECT * INTO profile FROM public.profiles WHERE id=auth.uid();
 IF profile.role='admin' THEN RETURN jsonb_build_object('role','admin','branchId',NULL,'branchName',NULL); END IF;
 IF profile.role IS DISTINCT FROM 'reception' THEN RAISE EXCEPTION 'Esta cuenta no tiene acceso a recepción.' USING ERRCODE='42501'; END IF;
 IF NOT public.can_access_cash_branch(profile.branch_id) THEN RAISE EXCEPTION 'La cuenta debe estar activa y tener una sucursal activa asignada.' USING ERRCODE='42501'; END IF;
 SELECT * INTO branch FROM public.branches WHERE id=profile.branch_id;
 RETURN jsonb_build_object('role','reception','branchId',branch.id,'branchName',branch.name);
END $$;

CREATE FUNCTION public.get_cash_sale_options(target_branch uuid)
RETURNS TABLE(employee_id uuid,barber_name text,service_id uuid,service_name text,price_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF target_branch IS NULL OR NOT public.can_access_cash_branch(target_branch) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.id,coalesce(p.full_name,p.username,'Barbero'),s.id,s.name,bs.price_cents
 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
 JOIN public.branches b ON b.id=p.branch_id
 JOIN public.barber_services assignments ON assignments.employee_id=p.id
 JOIN public.service_catalog s ON s.id=assignments.service_id
 JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=b.id
 WHERE p.role='barber' AND p.branch_id=target_branch AND d.active AND b.active AND s.active AND bs.active AND bs.price_cents>0
 ORDER BY p.full_name,s.name,p.id,s.id LIMIT 1000;
END $$;

ALTER TABLE public.cash_payments ADD COLUMN sale_payload jsonb;
CREATE FUNCTION public.register_cash_sale(target_branch uuid,target_employee uuid,catalog_service uuid,
 payment_method text,expected_cents bigint,operation_id uuid,payment_reference text DEFAULT '',sale_notes text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE catalog public.service_catalog; branch public.branches; config public.employee_compensation;
 price bigint; job uuid; receipt uuid; payload jsonb; existing public.cash_payments; sale_time timestamptz:=now(); barber text;
BEGIN
 IF target_branch IS NULL OR NOT public.can_access_cash_branch(target_branch) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF;
 IF operation_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador de la venta.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(operation_id::text,0));
 payload:=jsonb_build_object('branch',target_branch,'employee',target_employee,'service',catalog_service,'method',payment_method,'amount',expected_cents,'reference',coalesce(payment_reference,''),'notes',coalesce(sale_notes,''));
 SELECT * INTO existing FROM public.cash_payments WHERE request_id=operation_id;
 IF existing.id IS NOT NULL THEN
  IF existing.sale_payload=payload AND existing.recorded_by=auth.uid() THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'El identificador ya corresponde a otra operación.';
 END IF;
 IF payment_method IS NULL OR payment_method NOT IN ('cash','transfer') THEN RAISE EXCEPTION 'Elegí efectivo o transferencia.'; END IF;
 PERFORM 1 FROM public.employee_details WHERE employee_id=target_employee AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El barbero debe estar activo.'; END IF;
 SELECT coalesce(full_name,username,'Barbero') INTO barber FROM public.profiles
 WHERE id=target_employee AND role='barber' AND branch_id=target_branch FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El barbero no pertenece a la sucursal seleccionada.'; END IF;
 SELECT * INTO branch FROM public.branches WHERE id=target_branch AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La sucursal está inactiva.'; END IF;
 SELECT s.* INTO catalog FROM public.service_catalog s
 JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=target_branch
 JOIN public.barber_services assignments ON assignments.service_id=s.id AND assignments.employee_id=target_employee
 WHERE s.id=catalog_service AND s.active AND bs.active AND bs.price_cents>0 FOR SHARE OF s,bs,assignments;
 IF catalog.id IS NULL THEN RAISE EXCEPTION 'El servicio no está habilitado para este barbero y sucursal.'; END IF;
 SELECT price_cents INTO price FROM public.branch_services WHERE service_id=catalog_service AND branch_id=target_branch;
 IF expected_cents IS DISTINCT FROM price THEN RAISE EXCEPTION 'El precio cambió. Actualizá las opciones antes de guardar.'; END IF;
 SELECT * INTO config FROM public.employee_compensation WHERE employee_id=target_employee
 AND effective_from<=(sale_time AT TIME ZONE 'America/Argentina/Buenos_Aires')::date ORDER BY effective_from DESC LIMIT 1;
 IF config.id IS NULL THEN RAISE EXCEPTION 'Configurá primero la remuneración vigente del barbero.'; END IF;
 INSERT INTO public.employee_services(employee_id,service_id,service_name,category,performed_at,amount_cents,commission_percent,notes,recorded_by,branch_id,branch_name)
 VALUES(target_employee,catalog.id,catalog.name,catalog.category,sale_time,price,config.commission_percent,coalesce(sale_notes,''),auth.uid(),branch.id,branch.name) RETURNING id INTO job;
 INSERT INTO public.cash_payments(request_id,service_id,employee_id,branch_id,branch_name,barber_name,service_name,amount_cents,method,paid_at,reference,notes,recorded_by,sale_payload)
 VALUES(operation_id,job,target_employee,branch.id,branch.name,barber,catalog.name,price,payment_method,sale_time,coalesce(payment_reference,''),coalesce(sale_notes,''),auth.uid(),payload) RETURNING id INTO receipt;
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.get_cash_operator(),public.get_cash_sale_options(uuid),public.register_cash_sale(uuid,uuid,uuid,text,bigint,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_operator(),public.get_cash_sale_options(uuid),public.register_cash_sale(uuid,uuid,uuid,text,bigint,uuid,text,text) TO authenticated;
COMMIT;

