-- Una única comisión del empleado sobre el importe de cualquier servicio.
-- No recalcula servicios históricos ni cambia porcentajes configurados.
BEGIN;
CREATE OR REPLACE FUNCTION public.record_employee_service(
  target_employee uuid, service_label text, service_category text,
  service_at timestamptz, charged_cents bigint, service_notes text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE config public.employee_compensation; rate numeric(5,2) := 0; result uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar servicios.' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employee_details d JOIN public.profiles p ON p.id=d.employee_id WHERE d.employee_id=target_employee AND d.active AND p.role='barber') THEN
    RAISE EXCEPTION 'El empleado debe ser un barbero activo.';
  END IF;
  IF service_at IS NULL OR service_at > now() THEN RAISE EXCEPTION 'La fecha debe corresponder a un servicio ya realizado.'; END IF;
  SELECT * INTO config FROM public.employee_compensation
    WHERE employee_id=target_employee AND effective_from <= (service_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    ORDER BY effective_from DESC LIMIT 1;
  IF config.id IS NULL THEN RAISE EXCEPTION 'Configurá primero la remuneración vigente para la fecha del servicio.'; END IF;
  rate := config.commission_percent;
  INSERT INTO public.employee_services(employee_id, service_name, category, performed_at, amount_cents, commission_percent, notes, recorded_by)
    VALUES(target_employee, btrim(service_label), service_category, service_at, charged_cents, rate, coalesce(service_notes,''), auth.uid()) RETURNING id INTO result;
  RETURN result;
END $$;
COMMENT ON COLUMN public.employee_compensation.cut_percent IS 'Legado: ignorado. Se aplica commission_percent a todos los servicios.';
COMMENT ON COLUMN public.employee_compensation.beard_percent IS 'Legado: ignorado. Se aplica commission_percent a todos los servicios.';
COMMENT ON COLUMN public.employee_compensation.other_percent IS 'Legado: ignorado. Se aplica commission_percent a todos los servicios.';
COMMIT;
