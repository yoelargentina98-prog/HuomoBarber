BEGIN;
CREATE OR REPLACE FUNCTION public.get_pending_cash_services(service_day date,selected_branch uuid DEFAULT NULL)
RETURNS TABLE(id uuid,employee_id uuid,service_name text,barber_name text,branch_id uuid,branch_name text,amount_cents bigint,performed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE operator_branch uuid;
BEGIN
 IF NOT public.is_admin() THEN SELECT p.branch_id INTO operator_branch FROM public.profiles p WHERE p.id=auth.uid(); IF NOT public.can_access_cash_branch(operator_branch) OR (selected_branch IS NOT NULL AND selected_branch IS DISTINCT FROM operator_branch) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF; selected_branch:=operator_branch; END IF;
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
