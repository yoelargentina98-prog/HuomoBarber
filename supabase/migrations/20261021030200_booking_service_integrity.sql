BEGIN;
-- Keep the original atomic insertion private; the public wrapper validates and replays safely.
ALTER FUNCTION public.complete_appointment_service(uuid,text,text,text,uuid) RENAME TO complete_appointment_service_once;
REVOKE ALL ON FUNCTION public.complete_appointment_service_once(uuid,text,text,text,uuid) FROM PUBLIC,authenticated;
CREATE FUNCTION public.complete_appointment_service(p_appointment_id uuid,p_payment_method text DEFAULT NULL,p_payment_reference text DEFAULT '',p_sale_notes text DEFAULT '',p_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments; job public.employee_services; receipt public.cash_payments;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
 IF a.id IS NULL OR NOT public.can_access_cash_branch(a.branch_id) THEN RAISE EXCEPTION 'Sin acceso al turno.' USING ERRCODE='42501'; END IF;
 IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('cash','transfer') THEN RAISE EXCEPTION 'Medio de pago inválido.'; END IF;
 IF a.starts_at>now() THEN RAISE EXCEPTION 'No se puede completar un turno futuro.'; END IF;
 IF a.status='completed' THEN
  SELECT * INTO job FROM public.employee_services WHERE appointment_id=a.id AND voided_at IS NULL;
  IF job.id IS NULL THEN RAISE EXCEPTION 'La atención fue anulada. Revisá el historial antes de repetirla.'; END IF;
  SELECT * INTO receipt FROM public.cash_payments WHERE service_id=job.id AND voided_at IS NULL;
  IF (p_payment_method IS NULL AND receipt.id IS NOT NULL) OR
   (p_payment_method IS NOT NULL AND (receipt.id IS NULL OR receipt.method IS DISTINCT FROM p_payment_method OR receipt.reference IS DISTINCT FROM coalesce(p_payment_reference,'') OR receipt.notes IS DISTINCT FROM coalesce(p_sale_notes,'') OR (p_operation_id IS NOT NULL AND receipt.request_id<>p_operation_id))) OR
   job.notes IS DISTINCT FROM coalesce(nullif(btrim(p_sale_notes),''),a.notes) THEN RAISE EXCEPTION 'Este turno ya fue atendido con otros datos. Revisá Caja.'; END IF;
  RETURN jsonb_build_object('appointmentId',a.id,'serviceId',job.id,'receiptId',receipt.id,'status','completed');
 END IF;
 RETURN public.complete_appointment_service_once(p_appointment_id,p_payment_method,p_payment_reference,p_sale_notes,p_operation_id);
END $$;
REVOKE ALL ON FUNCTION public.complete_appointment_service(uuid,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_appointment_service(uuid,text,text,text,uuid) TO authenticated;

ALTER TABLE public.appointments ADD COLUMN arrived_at timestamptz;
CREATE FUNCTION public.mark_appointment_attendance(target_appointment uuid,attendance text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=target_appointment FOR UPDATE;
 IF a.id IS NULL OR NOT public.can_access_cash_branch(a.branch_id) THEN RAISE EXCEPTION 'Sin acceso al turno.' USING ERRCODE='42501'; END IF;
 IF a.status<>'confirmed' THEN RAISE EXCEPTION 'El turno debe estar confirmado.'; END IF;
 IF attendance='arrived' THEN
  IF (a.starts_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'Solo se registra la llegada en el día del turno.'; END IF;
  UPDATE public.appointments SET arrived_at=coalesce(arrived_at,now()),updated_at=now() WHERE id=a.id;
 ELSIF attendance='no_show' THEN
  IF a.ends_at>now() THEN RAISE EXCEPTION 'El turno todavía no terminó.'; END IF;
  IF a.arrived_at IS NOT NULL THEN RAISE EXCEPTION 'Ya se registró la llegada de este cliente.'; END IF;
  UPDATE public.appointments SET status='no_show',updated_at=now() WHERE id=a.id;
 ELSE RAISE EXCEPTION 'Acción de asistencia inválida.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.mark_appointment_attendance(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_appointment_attendance(uuid,text) TO authenticated;

-- Public directory never exposes inactive/unavailable assignments.
CREATE OR REPLACE FUNCTION public.get_public_barbers_by_branch_and_service(target_branch uuid,target_service uuid)
RETURNS TABLE(barber_id uuid,barber_name text,branch_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,coalesce(nullif(btrim(p.full_name),''),p.username,'Barbero'),p.branch_id
 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
 JOIN public.branches b ON b.id=p.branch_id JOIN public.barber_services a ON a.employee_id=p.id
 JOIN public.service_catalog s ON s.id=a.service_id JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=b.id
 WHERE p.role='barber' AND d.active AND b.active AND s.active AND bs.active AND bs.price_cents>0 AND b.id=target_branch AND s.id=target_service ORDER BY p.full_name,p.id;
$$;
COMMIT;
