BEGIN;
CREATE FUNCTION public.save_employee_personal(target_employee uuid, employee_name text, employee_phone text, start_date date, employee_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede editar empleados.' USING ERRCODE='42501'; END IF;
  IF length(btrim(employee_name)) NOT BETWEEN 2 AND 100 OR length(coalesce(employee_phone,''))>30
     OR length(coalesce(employee_notes,''))>5000 OR start_date IS NULL THEN RAISE EXCEPTION 'Revisá los datos del empleado.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id WHERE p.id=target_employee AND p.role IN ('barber','reception')) THEN RAISE EXCEPTION 'Empleado no encontrado.'; END IF;
  UPDATE public.profiles SET full_name=btrim(employee_name), phone=nullif(btrim(employee_phone),'') WHERE id=target_employee;
  UPDATE public.employee_details SET hire_date=start_date, notes=coalesce(employee_notes,'') WHERE employee_id=target_employee;
END $$;

-- Solo el servidor puede cambiar el estado, luego de modificar el bloqueo de Auth.
CREATE FUNCTION public.set_employee_access(target_employee uuid, enabled boolean, acting_admin uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=acting_admin AND role='admin') THEN RAISE EXCEPTION 'Operación exclusiva del servidor.' USING ERRCODE='42501'; END IF;
  IF enabled IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_employee AND role IN ('barber','reception')) THEN RAISE EXCEPTION 'Empleado inválido.'; END IF;
  PERFORM set_config('request.jwt.claim.sub',acting_admin::text,true);
  UPDATE public.employee_details SET active=enabled WHERE employee_id=target_employee;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha no encontrada.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_employee_personal(uuid,text,text,date,text), public.set_employee_access(uuid,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_employee_personal(uuid,text,text,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_employee_access(uuid,boolean,uuid) TO service_role;
COMMIT;
