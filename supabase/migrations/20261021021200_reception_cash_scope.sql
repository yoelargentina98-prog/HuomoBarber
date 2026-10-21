BEGIN;
CREATE OR REPLACE FUNCTION public.collect_service_payment(target_service uuid,payment_method text,payment_at timestamptz,
 operation_id uuid,payment_reference text DEFAULT '',payment_notes text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job public.employee_services; existing public.cash_payments; result uuid; barber text;
BEGIN
 IF NOT public.can_access_cash_branch((SELECT branch_id FROM public.profiles WHERE id=auth.uid())) THEN RAISE EXCEPTION 'No tenés acceso a Caja.' USING ERRCODE='42501'; END IF;
 IF operation_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador del cobro.'; END IF;
 -- Lock the service before checking active payment, also serializes against service voids.
 SELECT * INTO job FROM public.employee_services WHERE id=target_service FOR UPDATE;
 IF job.id IS NULL THEN RAISE EXCEPTION 'El servicio no existe.'; END IF;
 IF NOT public.can_access_cash_branch(job.branch_id) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing FROM public.cash_payments WHERE request_id=operation_id;
 IF existing.id IS NOT NULL THEN
  IF existing.service_id=target_service AND existing.method=payment_method
   AND existing.paid_at=payment_at AND existing.reference=coalesce(payment_reference,'')
   AND existing.notes=coalesce(payment_notes,'') THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'El identificador ya corresponde a otro cobro. Actualizá la caja.';
 END IF;
 IF job.voided_at IS NOT NULL THEN RAISE EXCEPTION 'No se puede cobrar un servicio anulado.'; END IF;
 IF job.branch_id IS NULL THEN RAISE EXCEPTION 'El servicio histórico no tiene sucursal. Requiere revisión antes de cobrar.'; END IF;
 IF job.amount_cents<=0 THEN RAISE EXCEPTION 'Un servicio sin importe no necesita cobro.'; END IF;
 IF payment_method IS NULL OR payment_method NOT IN ('cash','transfer') THEN RAISE EXCEPTION 'Elegí efectivo o transferencia.'; END IF;
 IF payment_at IS NULL OR payment_at>now() OR payment_at<job.performed_at THEN RAISE EXCEPTION 'La fecha de cobro debe ser posterior al servicio y no puede estar en el futuro.'; END IF;
 IF EXISTS(SELECT 1 FROM public.cash_payments WHERE service_id=target_service AND voided_at IS NULL) THEN RAISE EXCEPTION 'Este servicio ya tiene un cobro registrado.'; END IF;
 SELECT coalesce(full_name,username,'Barbero') INTO barber FROM public.profiles WHERE id=job.employee_id;
 INSERT INTO public.cash_payments(request_id,service_id,employee_id,branch_id,branch_name,barber_name,service_name,amount_cents,method,paid_at,reference,notes,recorded_by)
 VALUES(operation_id,job.id,job.employee_id,job.branch_id,coalesce(job.branch_name,(SELECT name FROM public.branches WHERE id=job.branch_id)),
 barber,job.service_name,job.amount_cents,payment_method,payment_at,coalesce(payment_reference,''),coalesce(payment_notes,''),auth.uid()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.get_pending_cash_services(service_day date,selected_branch uuid DEFAULT NULL)
RETURNS TABLE(id uuid,employee_id uuid,service_name text,barber_name text,branch_id uuid,branch_name text,amount_cents bigint,performed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE operator_branch uuid;
BEGIN
 IF NOT public.is_admin() THEN SELECT branch_id INTO operator_branch FROM public.profiles WHERE id=auth.uid(); IF NOT public.can_access_cash_branch(operator_branch) OR (selected_branch IS NOT NULL AND selected_branch IS DISTINCT FROM operator_branch) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF; selected_branch:=operator_branch; END IF;
 IF service_day IS NULL THEN RAISE EXCEPTION 'Indicá la fecha.'; END IF;
 RETURN QUERY SELECT s.id,s.employee_id,s.service_name,coalesce(p.full_name,p.username,'Barbero'),s.branch_id,s.branch_name,s.amount_cents,s.performed_at
 FROM public.employee_services s JOIN public.profiles p ON p.id=s.employee_id
 WHERE s.voided_at IS NULL AND s.amount_cents>0
 AND s.performed_at >= (service_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
 AND s.performed_at < ((service_day+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
 AND (selected_branch IS NULL OR s.branch_id=selected_branch)
 AND NOT EXISTS(SELECT 1 FROM public.cash_payments c WHERE c.service_id=s.id AND c.voided_at IS NULL)
 ORDER BY s.performed_at DESC,s.id LIMIT 1000;
END $$;
COMMIT;
