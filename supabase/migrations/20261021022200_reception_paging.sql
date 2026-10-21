BEGIN;
CREATE OR REPLACE FUNCTION public.get_reception_team(target_branch uuid DEFAULT NULL)
RETURNS TABLE(id uuid,full_name text,username text,role public.app_role,active boolean,services text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE own_branch uuid;
BEGIN
 IF public.is_admin() THEN
  IF target_branch IS NULL THEN RAISE EXCEPTION 'Elegí una sucursal.'; END IF;
 ELSE
  SELECT p.branch_id INTO own_branch FROM public.profiles p WHERE p.id=auth.uid();
  IF NOT public.can_access_cash_branch(own_branch) OR (target_branch IS NOT NULL AND target_branch IS DISTINCT FROM own_branch) THEN
   RAISE EXCEPTION 'Solo podés consultar el equipo de tu sucursal.' USING ERRCODE='42501';
  END IF;
  target_branch:=own_branch;
 END IF;
 RETURN QUERY SELECT p.id,p.full_name,p.username,p.role,d.active,
 ARRAY(SELECT s.name FROM public.barber_services a JOIN public.service_catalog s ON s.id=a.service_id
 JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=target_branch
 WHERE a.employee_id=p.id AND s.active AND bs.active ORDER BY s.name)
 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
 WHERE p.branch_id=target_branch AND p.role IN ('barber','reception')
 ORDER BY d.active DESC,p.full_name,p.id;
END $$;
REVOKE ALL ON FUNCTION public.get_reception_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_team(uuid) TO authenticated;


CREATE FUNCTION public.get_reception_team_count(target_branch uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(*) FROM public.get_reception_team(target_branch) t WHERE t.active AND t.role='barber';
$$;
REVOKE ALL ON FUNCTION public.get_reception_team_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_team_count(uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS cash_payment_page ON public.cash_payments(paid_at DESC,id);
CREATE INDEX IF NOT EXISTS employee_audit_page ON public.employee_audit(employee_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS employee_services_page ON public.employee_services(employee_id,performed_at DESC,id);
COMMIT;
