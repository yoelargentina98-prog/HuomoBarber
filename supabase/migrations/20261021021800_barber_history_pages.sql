BEGIN;
CREATE FUNCTION public.get_barber_service_history(week_start date,page_number integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE employee uuid:=auth.uid(); result jsonb;
BEGIN
 PERFORM public.get_barber_portal();
 IF week_start IS NULL OR extract(isodow FROM week_start)<>1 OR page_number IS NULL OR page_number<0 OR page_number>100000 THEN
  RAISE EXCEPTION 'Semana o página inválida.';
 END IF;
 WITH jobs AS (
  SELECT id,service_name,performed_at,amount_cents,commission_cents,branch_name FROM public.employee_services
  WHERE employee_id=employee AND voided_at IS NULL
   AND performed_at>=(week_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
   AND performed_at<((week_start+7)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
 ), page AS (SELECT * FROM jobs ORDER BY performed_at DESC,id LIMIT 20 OFFSET page_number*20)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM jobs),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.performed_at DESC,p.id) FROM page p),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_barber_service_history(date,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_barber_service_history(date,integer) TO authenticated;
COMMIT;
