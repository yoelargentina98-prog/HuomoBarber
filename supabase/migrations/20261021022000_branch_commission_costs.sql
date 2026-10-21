BEGIN;
CREATE INDEX IF NOT EXISTS services_branch_month ON public.employee_services(branch_id,performed_at) WHERE voided_at IS NULL;
ALTER TABLE public.branch_expenses DROP CONSTRAINT branch_expenses_category_check;
ALTER TABLE public.branch_expenses ADD CONSTRAINT branch_expenses_category_check CHECK(category IN ('electricity','water','rent','gas','internet','supplies','maintenance','taxes','payroll','commission_payment','other'));
-- Commission settlement is a payment of an already recognized cost, never a second cost.
DROP FUNCTION public.get_branch_balances(date);
CREATE FUNCTION public.get_branch_balances(month_start date)
RETURNS TABLE(branch_id uuid,branch_name text,active boolean,income_cents bigint,expense_cents bigint,commission_cents bigint,total_cost_cents bigint,balance_cents bigint,payment_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede consultar balances.' USING ERRCODE='42501'; END IF;
 IF month_start IS NULL OR extract(day FROM month_start)<>1 THEN RAISE EXCEPTION 'Indicá el primer día del mes.'; END IF;
 RETURN QUERY WITH receipts AS (
  SELECT c.branch_id,sum(c.amount_cents)::bigint AS income,count(*) AS count FROM public.cash_payments c
  WHERE c.voided_at IS NULL AND c.paid_at>=(month_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
   AND c.paid_at<((month_start+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') GROUP BY c.branch_id
 ), expenses AS (
  SELECT e.branch_id,sum(e.amount_cents)::bigint AS amount FROM public.branch_expenses e
  WHERE e.voided_at IS NULL AND e.category<>'commission_payment' AND e.paid_on>=month_start AND e.paid_on<(month_start+interval '1 month')::date GROUP BY e.branch_id
 ), commissions AS (
  SELECT s.branch_id,sum(s.commission_cents)::bigint AS amount FROM public.employee_services s
  WHERE s.voided_at IS NULL AND s.performed_at>=(month_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
   AND s.performed_at<((month_start+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') GROUP BY s.branch_id
 ) SELECT b.id,b.name,b.active,coalesce(r.income,0),coalesce(e.amount,0),coalesce(c.amount,0),coalesce(e.amount,0)+coalesce(c.amount,0),coalesce(r.income,0)-coalesce(e.amount,0)-coalesce(c.amount,0),coalesce(r.count,0)
 FROM public.branches b LEFT JOIN receipts r ON r.branch_id=b.id LEFT JOIN expenses e ON e.branch_id=b.id LEFT JOIN commissions c ON c.branch_id=b.id ORDER BY b.name,b.id;
END $$;
CREATE FUNCTION public.get_branch_commissions(target_branch uuid,month_start date)
RETURNS TABLE(employee_id uuid,full_name text,username text,active boolean,belongs_here boolean,service_count bigint,commission_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede consultar comisiones.' USING ERRCODE='42501'; END IF;
 IF month_start IS NULL OR extract(day FROM month_start)<>1 THEN RAISE EXCEPTION 'Mes inválido.'; END IF;
 RETURN QUERY WITH costs AS (
  SELECT s.employee_id,count(*) AS count,sum(s.commission_cents)::bigint AS amount FROM public.employee_services s
  WHERE s.branch_id=target_branch AND s.voided_at IS NULL
   AND s.performed_at>=(month_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
   AND s.performed_at<((month_start+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') GROUP BY s.employee_id
 ) SELECT p.id,p.full_name,p.username,d.active,coalesce(p.branch_id=target_branch,false),coalesce(c.count,0),coalesce(c.amount,0)
 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id LEFT JOIN costs c ON c.employee_id=p.id
 WHERE (p.role='barber' AND p.branch_id=target_branch) OR c.employee_id IS NOT NULL ORDER BY coalesce(c.amount,0) DESC,p.full_name,p.id;
END $$;
REVOKE ALL ON FUNCTION public.get_branch_balances(date),public.get_branch_commissions(uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_branch_balances(date),public.get_branch_commissions(uuid,date) TO authenticated;
COMMIT;
