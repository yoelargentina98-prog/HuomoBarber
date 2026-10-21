-- Escrituras históricas controladas. No se borran servicios ni movimientos.
BEGIN;
CREATE FUNCTION public.record_employee_service(
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
  rate := coalesce(CASE service_category WHEN 'cut' THEN config.cut_percent WHEN 'beard' THEN config.beard_percent WHEN 'other' THEN config.other_percent END, config.commission_percent);
  INSERT INTO public.employee_services(employee_id, service_name, category, performed_at, amount_cents, commission_percent, notes, recorded_by)
    VALUES(target_employee, btrim(service_label), service_category, service_at, charged_cents, rate, coalesce(service_notes,''), auth.uid()) RETURNING id INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.record_employee_adjustment(target_employee uuid, target_period date, movement_kind text, movement_cents bigint, movement_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar movimientos.' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.employee_adjustments(employee_id, period, kind, amount_cents, description, recorded_by)
    VALUES(target_employee, target_period, movement_kind, movement_cents, btrim(movement_description), auth.uid()) RETURNING id INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.void_employee_entry(entry_type text, entry_id uuid, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE affected integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede anular registros.' USING ERRCODE = '42501'; END IF;
  IF length(btrim(reason)) < 3 OR length(reason)>300 THEN RAISE EXCEPTION 'Indicá un motivo de anulación entre 3 y 300 caracteres.'; END IF;
  IF entry_type = 'service' THEN
    UPDATE public.employee_services SET voided_at=now(), void_reason=btrim(reason) WHERE id=entry_id AND voided_at IS NULL;
  ELSIF entry_type = 'adjustment' THEN
    UPDATE public.employee_adjustments SET voided_at=now(), void_reason=btrim(reason) WHERE id=entry_id AND voided_at IS NULL;
  ELSE RAISE EXCEPTION 'Tipo de registro inválido.';
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN RAISE EXCEPTION 'El registro no existe o ya fue anulado.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.record_employee_service(uuid,text,text,timestamptz,bigint,text),
 public.record_employee_adjustment(uuid,date,text,bigint,text), public.void_employee_entry(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_employee_service(uuid,text,text,timestamptz,bigint,text),
 public.record_employee_adjustment(uuid,date,text,bigint,text), public.void_employee_entry(text,uuid,text) TO authenticated;
COMMIT;
