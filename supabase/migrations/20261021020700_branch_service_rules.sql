BEGIN;
CREATE OR REPLACE FUNCTION public.set_barber_services(target_employee uuid, service_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE branch uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede asignar servicios.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.employee_details WHERE employee_id=target_employee FOR UPDATE;
 SELECT branch_id INTO branch FROM public.profiles WHERE id=target_employee AND role='barber';
 IF branch IS NULL THEN RAISE EXCEPTION 'Asigná primero una sucursal al barbero.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branches WHERE id=branch AND active) THEN RAISE EXCEPTION 'La sucursal está inactiva.'; END IF;
 IF service_ids IS NULL OR cardinality(service_ids)>500 THEN RAISE EXCEPTION 'Selección inválida.'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(service_ids) selected(id)
   LEFT JOIN public.service_catalog s ON s.id=selected.id
   LEFT JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=branch
   WHERE s.id IS NULL OR ((NOT s.active OR bs.service_id IS NULL OR NOT bs.active OR bs.price_cents IS NULL)
     AND NOT EXISTS(SELECT 1 FROM public.barber_services b WHERE b.employee_id=target_employee AND b.service_id=s.id))) THEN
   RAISE EXCEPTION 'Solo podés asignar servicios disponibles y con precio en la sucursal del barbero.';
 END IF;
 DELETE FROM public.barber_services WHERE employee_id=target_employee AND NOT(service_id=ANY(service_ids));
 INSERT INTO public.barber_services(employee_id,service_id) SELECT target_employee,id FROM unnest(service_ids) selected(id) ON CONFLICT DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.record_catalog_service(target_employee uuid,catalog_service uuid,
 service_at timestamptz,charged_cents bigint,service_notes text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE catalog public.service_catalog; config public.employee_compensation; branch public.branches; result uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar servicios.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.employee_details WHERE employee_id=target_employee AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El empleado debe estar activo.'; END IF;
 SELECT b.* INTO branch FROM public.branches b JOIN public.profiles p ON p.branch_id=b.id WHERE p.id=target_employee AND p.role='barber' AND b.active;
 IF branch.id IS NULL THEN RAISE EXCEPTION 'El barbero debe tener una sucursal activa asignada.'; END IF;
 SELECT s.* INTO catalog FROM public.service_catalog s JOIN public.barber_services bs ON bs.service_id=s.id
   JOIN public.branch_services price ON price.service_id=s.id AND price.branch_id=branch.id
   WHERE bs.employee_id=target_employee AND s.id=catalog_service AND s.active AND price.active AND price.price_cents IS NOT NULL FOR SHARE OF s,price;
 IF catalog.id IS NULL THEN RAISE EXCEPTION 'El servicio debe estar habilitado para este barbero y su sucursal, con precio configurado.'; END IF;
 IF service_at IS NULL OR service_at>now() THEN RAISE EXCEPTION 'Indicá la fecha de un servicio ya realizado.'; END IF;
 SELECT * INTO config FROM public.employee_compensation WHERE employee_id=target_employee
   AND effective_from<=(service_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date ORDER BY effective_from DESC LIMIT 1;
 IF config.id IS NULL THEN RAISE EXCEPTION 'Configurá la remuneración vigente.'; END IF;
 INSERT INTO public.employee_services(employee_id,service_id,service_name,category,performed_at,amount_cents,commission_percent,notes,recorded_by,branch_id,branch_name)
 VALUES(target_employee,catalog.id,catalog.name,catalog.category,service_at,charged_cents,config.commission_percent,coalesce(service_notes,''),auth.uid(),branch.id,branch.name) RETURNING id INTO result;
 RETURN result;
END $$;
COMMIT;
