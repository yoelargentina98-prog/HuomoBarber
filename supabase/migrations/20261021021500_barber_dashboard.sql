BEGIN;
-- Deliberately no employee-id parameter: identity always comes from the JWT.
CREATE FUNCTION public.get_barber_dashboard(week_start date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE employee uuid:=auth.uid(); result jsonb; month_start date:=date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
 PERFORM public.get_barber_portal();
 IF week_start IS NULL OR extract(isodow FROM week_start)<>1 THEN RAISE EXCEPTION 'La semana debe empezar un lunes.'; END IF;
 WITH jobs AS (
  SELECT s.* FROM public.employee_services s WHERE s.employee_id=employee AND s.voided_at IS NULL
  AND s.performed_at>=(week_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
  AND s.performed_at<((week_start+7)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
 ), history AS (
  SELECT coalesce(service_id::text,'legacy:'||service_name) AS key,max(service_name) AS name,
   count(*) AS count,sum(amount_cents) AS revenue,sum(commission_cents) AS commission
  FROM jobs GROUP BY coalesce(service_id::text,'legacy:'||service_name)
 ), assigned AS (
  SELECT s.id::text AS key,s.name,s.active FROM public.barber_services a
  JOIN public.service_catalog s ON s.id=a.service_id WHERE a.employee_id=employee
 ), breakdown AS (
  SELECT coalesce(a.key,h.key) AS key,coalesce(a.name,h.name) AS name,a.key IS NOT NULL AS assigned,
   coalesce(a.active,false) AS active,coalesce(h.count,0) AS count,coalesce(h.revenue,0) AS revenue,coalesce(h.commission,0) AS commission
  FROM assigned a FULL JOIN history h ON a.key=h.key
 ), days AS (
  SELECT day::date AS date,count(j.id) AS count,coalesce(sum(j.commission_cents),0) AS commission
  FROM generate_series(week_start::timestamp,(week_start+6)::timestamp,interval '1 day') day
  LEFT JOIN jobs j ON (j.performed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=day::date GROUP BY day
 )
 SELECT jsonb_build_object(
  'weekStart',week_start,
  'count',(SELECT count(*) FROM jobs),
  'revenue',(SELECT coalesce(sum(amount_cents),0) FROM jobs),
  'commission',(SELECT coalesce(sum(commission_cents),0) FROM jobs),
  'fixedMonth',month_start,
  'fixed',(SELECT monthly_fixed_cents FROM public.employee_compensation WHERE employee_id=employee AND effective_from<=month_start ORDER BY effective_from DESC LIMIT 1),
  'services',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.count DESC,b.name) FROM breakdown b),'[]'::jsonb),
  'days',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date) FROM days d),'[]'::jsonb),
  'recent',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.performed_at DESC,r.id) FROM
   (SELECT id,service_name,performed_at,amount_cents,commission_cents,branch_name FROM jobs ORDER BY performed_at DESC,id LIMIT 20) r),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_barber_dashboard(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_barber_dashboard(date) TO authenticated;
COMMIT;
