BEGIN;
-- Whitelisted queries only; never interpolate client SQL or accept an employee scope for barbers.
CREATE OR REPLACE FUNCTION public.get_management_page(resource text, filters jsonb DEFAULT '{}', page_number integer DEFAULT 0, page_size integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE q text; result jsonb; branch uuid:=nullif(filters->>'branch','')::uuid;
 employee uuid:=nullif(filters->>'employee','')::uuid; month_date date:=nullif(filters->>'month','')::date;
 day_date date:=nullif(filters->>'day','')::date; operator_branch uuid;
BEGIN
 IF page_number<0 OR page_number IS NULL OR page_size IS NULL OR page_size<1 OR page_size>(CASE WHEN resource IN ('cash_payments','cash_pending') THEN 200 ELSE 20 END) THEN
  RAISE EXCEPTION 'Paginación inválida.';
 END IF;
 IF resource IN ('cash_payments','cash_pending') THEN
  IF day_date IS NULL THEN RAISE EXCEPTION 'Indicá la fecha.'; END IF;
  IF NOT public.is_admin() THEN
   SELECT p.branch_id INTO operator_branch FROM public.profiles p WHERE p.id=auth.uid();
   IF NOT public.can_access_cash_branch(operator_branch) OR (branch IS NOT NULL AND branch IS DISTINCT FROM operator_branch) THEN
    RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501';
   END IF;
   branch:=operator_branch;
  END IF;
  IF resource='cash_payments' THEN
   IF coalesce(filters->>'method','all') NOT IN ('all','cash','transfer') THEN RAISE EXCEPTION 'Medio inválido.'; END IF;
   q:=format('SELECT c.* FROM public.cash_payments c WHERE c.paid_at>=(%L::date::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') AND c.paid_at<((%L::date+1)::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') AND (%L::uuid IS NULL OR c.branch_id=%L::uuid) AND (%L=''all'' OR c.method=%L) ORDER BY c.paid_at DESC,c.id',day_date,day_date,branch,branch,coalesce(filters->>'method','all'),filters->>'method');
  ELSE
   q:=format('SELECT s.id,s.employee_id,s.service_name,coalesce(p.full_name,p.username,''Barbero'') AS barber_name,s.branch_id,s.branch_name,s.amount_cents,s.performed_at FROM public.employee_services s JOIN public.profiles p ON p.id=s.employee_id WHERE s.voided_at IS NULL AND s.amount_cents>0 AND s.performed_at>=(%L::date::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') AND s.performed_at<((%L::date+1)::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') AND (%L::uuid IS NULL OR s.branch_id=%L::uuid) AND NOT EXISTS(SELECT 1 FROM public.cash_payments c WHERE c.service_id=s.id AND c.voided_at IS NULL) ORDER BY s.performed_at DESC,s.id',day_date,day_date,branch,branch);
  END IF;
 ELSIF resource='reception_team' THEN
  q:=format('SELECT t.* FROM public.get_reception_team(%L::uuid) t WHERE (%L=''all'' OR t.role::text=%L) AND strpos(lower(coalesce(t.full_name,'''')||'' ''||coalesce(t.username,'''')),lower(%L))>0 ORDER BY t.full_name,t.id',branch,coalesce(filters->>'role','all'),filters->>'role',coalesce(filters->>'search',''));
 ELSE
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede consultar este listado.' USING ERRCODE='42501'; END IF;
  CASE resource
   WHEN 'employee_services' THEN
    q:=format('SELECT s.* FROM public.employee_services s WHERE s.employee_id=%L::uuid AND s.performed_at>=(%L::date::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') AND s.performed_at<((%L::date+interval ''1 month'')::timestamp AT TIME ZONE ''America/Argentina/Buenos_Aires'') ORDER BY s.performed_at DESC,s.id',employee,month_date,month_date);
   WHEN 'employee_adjustments' THEN
    q:=format('SELECT a.* FROM public.employee_adjustments a WHERE a.employee_id=%L::uuid AND a.period=%L::date ORDER BY a.created_at DESC,a.id',employee,month_date);
   WHEN 'employee_audit' THEN
    q:=format('SELECT a.* FROM public.employee_audit a WHERE a.employee_id=%L::uuid ORDER BY a.created_at DESC,a.id',employee);
   WHEN 'employee_compensation' THEN
    q:=format('SELECT c.* FROM public.employee_compensation c WHERE c.employee_id=%L::uuid ORDER BY c.effective_from DESC,c.id',employee);
   WHEN 'branch_expenses' THEN
    q:=format('SELECT e.* FROM public.branch_expenses e WHERE e.branch_id=%L::uuid AND e.paid_on>=%L::date AND e.paid_on<(%L::date+interval ''1 month'')::date ORDER BY e.paid_on DESC,e.created_at DESC,e.id',branch,month_date,month_date);
   WHEN 'branch_commissions' THEN
    q:=format('SELECT c.* FROM public.get_branch_commissions(%L::uuid,%L::date) c ORDER BY c.commission_cents DESC,c.full_name,c.employee_id',branch,month_date);
   WHEN 'staff' THEN
    q:=format('SELECT p.id,p.username,p.full_name,p.phone,p.role,p.created_at,p.branch_id,b.name AS branch_name FROM public.profiles p LEFT JOIN public.branches b ON b.id=p.branch_id WHERE p.role IN (''barber'',''reception'') AND (%L=''all'' OR p.role::text=%L) AND strpos(lower(coalesce(p.full_name,'''')||'' ''||coalesce(p.username,'''')||'' ''||coalesce(p.phone,'''')),lower(%L))>0 ORDER BY p.created_at DESC,p.id',coalesce(filters->>'role','all'),filters->>'role',coalesce(filters->>'search',''));
   WHEN 'catalog' THEN
    q:=format('SELECT s.* FROM public.service_catalog s WHERE (%L=''all'' OR s.active=(%L=''active'')) AND strpos(lower(s.name),lower(%L))>0 ORDER BY s.name,s.id',coalesce(filters->>'status','all'),filters->>'status',coalesce(filters->>'search',''));
   WHEN 'branches' THEN q:='SELECT b.* FROM public.branches b ORDER BY b.name,b.id';
   ELSE RAISE EXCEPTION 'Listado desconocido.';
  END CASE;
 END IF;
 -- Count and page share one statement/snapshot. Clamp after deletions or filter changes.
 EXECUTE format('WITH filtered AS MATERIALIZED (SELECT row_number() OVER () AS ordinal,to_jsonb(d) AS payload FROM (%s) d), counted AS (SELECT count(*) AS total FROM filtered), position AS (SELECT total,least(%s,greatest(0,(total-1)/%s)) AS page FROM counted) SELECT jsonb_build_object(''total'',p.total,''page'',p.page,''rows'',coalesce((SELECT jsonb_agg(r.payload ORDER BY r.ordinal) FROM (SELECT * FROM filtered ORDER BY ordinal LIMIT %s OFFSET (p.page*%s)) r),''[]''::jsonb)) FROM position p',q,page_number,page_size,page_size,page_size) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_management_page(text,jsonb,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_management_page(text,jsonb,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cash_day_summary(service_day date, selected_branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE operator_branch uuid; result jsonb; pending_count bigint;
BEGIN
 IF service_day IS NULL THEN RAISE EXCEPTION 'Indicá la fecha.'; END IF;
 IF NOT public.is_admin() THEN
  SELECT p.branch_id INTO operator_branch FROM public.profiles p WHERE p.id=auth.uid();
  IF NOT public.can_access_cash_branch(operator_branch) OR (selected_branch IS NOT NULL AND selected_branch IS DISTINCT FROM operator_branch) THEN RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501'; END IF;
  selected_branch:=operator_branch;
 END IF;
 SELECT jsonb_build_object('cash',coalesce(sum(c.amount_cents) FILTER(WHERE c.method='cash' AND c.voided_at IS NULL),0),'transfer',coalesce(sum(c.amount_cents) FILTER(WHERE c.method='transfer' AND c.voided_at IS NULL),0),'cashCount',count(*) FILTER(WHERE c.method='cash' AND c.voided_at IS NULL),'transferCount',count(*) FILTER(WHERE c.method='transfer' AND c.voided_at IS NULL),'voided',count(*) FILTER(WHERE c.voided_at IS NOT NULL),'total',coalesce(sum(c.amount_cents) FILTER(WHERE c.voided_at IS NULL),0)) INTO result
 FROM public.cash_payments c WHERE c.paid_at>=(service_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AND c.paid_at<((service_day+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AND (selected_branch IS NULL OR c.branch_id=selected_branch);
 SELECT count(*) INTO pending_count FROM public.employee_services s WHERE s.voided_at IS NULL AND s.amount_cents>0 AND s.performed_at>=(service_day::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AND s.performed_at<((service_day+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AND (selected_branch IS NULL OR s.branch_id=selected_branch) AND NOT EXISTS(SELECT 1 FROM public.cash_payments c WHERE c.service_id=s.id AND c.voided_at IS NULL);
 RETURN result||jsonb_build_object('pendingCount',pending_count);
END $$;
REVOKE ALL ON FUNCTION public.get_cash_day_summary(date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_day_summary(date,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_employee_month_summary(target_employee uuid, month_start date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; extras bigint; deductions bigint; fixed bigint;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración.' USING ERRCODE='42501'; END IF;
 IF month_start IS NULL OR extract(day FROM month_start)<>1 THEN RAISE EXCEPTION 'Mes inválido.'; END IF;
 SELECT jsonb_build_object('count',count(*),'cuts',count(*) FILTER(WHERE s.category='cut'),'beards',count(*) FILTER(WHERE s.category='beard'),'others',count(*) FILTER(WHERE s.category='other'),'revenue',coalesce(sum(s.amount_cents),0),'commission',coalesce(sum(s.commission_cents),0)) INTO result FROM public.employee_services s WHERE s.employee_id=target_employee AND s.voided_at IS NULL AND s.performed_at>=(month_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') AND s.performed_at<((month_start+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires');
 SELECT coalesce(sum(a.amount_cents) FILTER(WHERE a.kind<>'deduction'),0),coalesce(sum(a.amount_cents) FILTER(WHERE a.kind='deduction'),0) INTO extras,deductions FROM public.employee_adjustments a WHERE a.employee_id=target_employee AND a.period=month_start AND a.voided_at IS NULL;
 SELECT c.monthly_fixed_cents INTO fixed FROM public.employee_compensation c WHERE c.employee_id=target_employee AND c.effective_from<=month_start ORDER BY c.effective_from DESC LIMIT 1;
 fixed:=coalesce(fixed,0);
 RETURN result||jsonb_build_object('fixed',fixed,'extras',extras,'deductions',deductions,'estimated',fixed+(result->>'commission')::bigint+extras-deductions);
END $$;
REVOKE ALL ON FUNCTION public.get_employee_month_summary(uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_month_summary(uuid,date) TO authenticated;
COMMIT;

