BEGIN;
-- A service can have one active full payment. Voids preserve every receipt.
CREATE TABLE public.cash_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 service_id uuid NOT NULL REFERENCES public.employee_services(id),
 employee_id uuid NOT NULL REFERENCES public.employee_details(employee_id),
 branch_id uuid NOT NULL REFERENCES public.branches(id),
 branch_name text NOT NULL,
 barber_name text NOT NULL,
 service_name text NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents>0),
 method text NOT NULL CHECK(method IN ('cash','transfer')),
 paid_at timestamptz NOT NULL,
 reference text NOT NULL DEFAULT '' CHECK(length(reference)<=200),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 recorded_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 voided_at timestamptz,
 void_reason text,
 voided_by uuid REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX cash_payment_active_service ON public.cash_payments(service_id) WHERE voided_at IS NULL;
CREATE INDEX cash_payment_day ON public.cash_payments(paid_at,branch_id);
ALTER TABLE public.cash_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cash_payments FROM anon,authenticated;
GRANT SELECT ON public.cash_payments TO authenticated;
GRANT ALL ON public.cash_payments TO service_role;
CREATE POLICY admin_read ON public.cash_payments FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE TRIGGER payment_audit AFTER INSERT OR UPDATE ON public.cash_payments FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();

CREATE FUNCTION public.collect_service_payment(target_service uuid,payment_method text,payment_at timestamptz,
 operation_id uuid,payment_reference text DEFAULT '',payment_notes text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job public.employee_services; existing public.cash_payments; result uuid; barber text;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar cobros.' USING ERRCODE='42501'; END IF;
 IF operation_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador del cobro.'; END IF;
 -- Lock the service before checking active payment, also serializes against service voids.
 SELECT * INTO job FROM public.employee_services WHERE id=target_service FOR UPDATE;
 IF job.id IS NULL THEN RAISE EXCEPTION 'El servicio no existe.'; END IF;
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

CREATE FUNCTION public.void_cash_payment(target_payment uuid,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_service uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede anular cobros.' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(reason,''))) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'Indicá un motivo de 3 a 300 caracteres.'; END IF;
 SELECT service_id INTO target_service FROM public.cash_payments WHERE id=target_payment;
 IF target_service IS NULL THEN RAISE EXCEPTION 'El cobro no existe.'; END IF;
 PERFORM 1 FROM public.employee_services WHERE id=target_service FOR UPDATE;
 UPDATE public.cash_payments SET voided_at=now(),void_reason=btrim(reason),voided_by=auth.uid()
 WHERE id=target_payment AND voided_at IS NULL;
END $$;

CREATE FUNCTION public.prevent_void_paid_service() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL AND EXISTS(
  SELECT 1 FROM public.cash_payments WHERE service_id=NEW.id AND voided_at IS NULL) THEN
  RAISE EXCEPTION 'Anulá primero el cobro en Caja antes de anular este servicio.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prevent_void_paid_service BEFORE UPDATE OF voided_at ON public.employee_services
 FOR EACH ROW EXECUTE FUNCTION public.prevent_void_paid_service();

CREATE FUNCTION public.get_pending_cash_services(service_day date,selected_branch uuid DEFAULT NULL)
RETURNS TABLE(id uuid,employee_id uuid,service_name text,barber_name text,branch_id uuid,branch_name text,amount_cents bigint,performed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede consultar cobros pendientes.' USING ERRCODE='42501'; END IF;
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
REVOKE ALL ON FUNCTION public.collect_service_payment(uuid,text,timestamptz,uuid,text,text),public.void_cash_payment(uuid,text),public.prevent_void_paid_service(),public.get_pending_cash_services(date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.collect_service_payment(uuid,text,timestamptz,uuid,text,text),public.void_cash_payment(uuid,text),public.get_pending_cash_services(date,uuid) TO authenticated;
COMMIT;
