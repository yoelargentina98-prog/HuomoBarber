BEGIN;
-- Se reemplaza el alta libre: únicamente catálogo + asignación activa.
REVOKE EXECUTE ON FUNCTION public.record_employee_service(uuid,text,text,timestamptz,bigint,text) FROM authenticated;
CREATE FUNCTION public.record_catalog_service(target_employee uuid, catalog_service uuid,
  service_at timestamptz, charged_cents bigint, service_notes text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE catalog public.service_catalog; config public.employee_compensation; result uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar servicios.' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.employee_details d JOIN public.profiles p ON p.id=d.employee_id
    WHERE d.employee_id=target_employee AND d.active AND p.role='barber' FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'El empleado debe ser un barbero activo.'; END IF;
  SELECT s.* INTO catalog FROM public.service_catalog s JOIN public.barber_services b ON b.service_id=s.id
    WHERE b.employee_id=target_employee AND s.id=catalog_service AND s.active FOR SHARE OF s;
  IF catalog.id IS NULL THEN RAISE EXCEPTION 'El servicio debe estar activo y asignado a este barbero.'; END IF;
  IF service_at IS NULL OR service_at>now() THEN RAISE EXCEPTION 'Indicá la fecha de un servicio ya realizado.'; END IF;
  SELECT * INTO config FROM public.employee_compensation WHERE employee_id=target_employee
    AND effective_from <= (service_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date ORDER BY effective_from DESC LIMIT 1;
  IF config.id IS NULL THEN RAISE EXCEPTION 'Configurá primero la remuneración vigente para esa fecha.'; END IF;
  INSERT INTO public.employee_services(employee_id,service_id,service_name,category,performed_at,amount_cents,commission_percent,notes,recorded_by)
    VALUES(target_employee,catalog.id,catalog.name,catalog.category,service_at,charged_cents,config.commission_percent,coalesce(service_notes,''),auth.uid()) RETURNING id INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_catalog_service(uuid,uuid,timestamptz,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_catalog_service(uuid,uuid,timestamptz,bigint,text) TO authenticated;
COMMIT;
