BEGIN;
-- Aggregate before returning rows: no client-side truncation of service history.
CREATE FUNCTION public.get_team_weekly_stats(week_start date, selected_branch uuid DEFAULT NULL)
RETURNS TABLE(employee_id uuid, full_name text, username text, service_count bigint,
 revenue_cents bigint, commission_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Solo administración puede consultar el desempeño del equipo.' USING ERRCODE='42501';
 END IF;
 IF week_start IS NULL OR extract(isodow FROM week_start)<>1 THEN
  RAISE EXCEPTION 'La semana debe comenzar un lunes.';
 END IF;
 RETURN QUERY
 SELECT p.id,p.full_name,p.username,count(*)::bigint,sum(s.amount_cents)::bigint,sum(s.commission_cents)::bigint
 FROM public.employee_services s JOIN public.profiles p ON p.id=s.employee_id
 WHERE p.role='barber' AND s.voided_at IS NULL
  AND s.performed_at >= (week_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
  AND s.performed_at < ((week_start+7)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
  AND (selected_branch IS NULL OR s.branch_id=selected_branch)
 GROUP BY p.id,p.full_name,p.username ORDER BY sum(s.amount_cents) DESC,p.id;
END $$;
REVOKE ALL ON FUNCTION public.get_team_weekly_stats(date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_weekly_stats(date,uuid) TO authenticated;
COMMIT;
