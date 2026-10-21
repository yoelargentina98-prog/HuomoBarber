BEGIN;
CREATE TABLE public.branch_expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL UNIQUE,
 branch_id uuid NOT NULL REFERENCES public.branches(id),
 category text NOT NULL CHECK(category IN ('electricity','water','rent','gas','internet','supplies','maintenance','taxes','payroll','other')),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 3 AND 300),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000000),
 paid_on date NOT NULL,
 method text NOT NULL CHECK(method IN ('cash','transfer')),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 recorded_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 voided_at timestamptz,
 voided_by uuid REFERENCES auth.users(id),
 void_reason text
);
CREATE INDEX branch_expenses_period ON public.branch_expenses(branch_id,paid_on DESC);
CREATE TABLE public.branch_expense_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 expense_id uuid NOT NULL REFERENCES public.branch_expenses(id),
 branch_id uuid NOT NULL REFERENCES public.branches(id),
 actor_id uuid,
 action text NOT NULL,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.audit_branch_expense() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.branch_expense_audit(expense_id,branch_id,actor_id,action,before_data,after_data)
 VALUES(NEW.id,NEW.branch_id,auth.uid(),TG_OP,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
 RETURN NEW;
END $$;
CREATE TRIGGER branch_expense_audit AFTER INSERT OR UPDATE ON public.branch_expenses FOR EACH ROW EXECUTE FUNCTION public.audit_branch_expense();
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['branch_expenses','branch_expense_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',name);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',name);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',name);
  EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.is_admin()))',name);
 END LOOP;
END $$;

CREATE FUNCTION public.record_branch_expense(target_branch uuid,expense_category text,expense_description text,
 expense_cents bigint,expense_date date,payment_method text,request_id uuid,expense_notes text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing public.branch_expenses; result uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede registrar gastos.' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador del gasto.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_id::text,0));
 SELECT * INTO existing FROM public.branch_expenses WHERE operation_id=request_id;
 IF existing.id IS NOT NULL THEN
  IF existing.branch_id=target_branch AND existing.category=expense_category AND existing.description=btrim(expense_description)
   AND existing.amount_cents=expense_cents AND existing.paid_on=expense_date AND existing.method=payment_method
   AND existing.notes=coalesce(expense_notes,'') AND existing.recorded_by=auth.uid() THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'Este intento ya corresponde a un gasto registrado. Actualizá el listado antes de cargar otro.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branches WHERE id=target_branch) THEN RAISE EXCEPTION 'La sucursal no existe.'; END IF;
 IF expense_date IS NULL OR expense_date>(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
  RAISE EXCEPTION 'Indicá la fecha de un gasto ya pagado, sin fecha futura.';
 END IF;
 INSERT INTO public.branch_expenses(operation_id,branch_id,category,description,amount_cents,paid_on,method,notes,recorded_by)
 VALUES(request_id,target_branch,expense_category,btrim(expense_description),expense_cents,expense_date,payment_method,coalesce(expense_notes,''),auth.uid()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.void_branch_expense(target_expense uuid,reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede anular gastos.' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(reason,''))) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'Indicá un motivo de 3 a 300 caracteres.'; END IF;
 UPDATE public.branch_expenses SET voided_at=now(),voided_by=auth.uid(),void_reason=btrim(reason) WHERE id=target_expense AND voided_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'El gasto no existe o ya fue anulado.'; END IF;
END $$;

CREATE FUNCTION public.get_branch_balances(month_start date)
RETURNS TABLE(branch_id uuid,branch_name text,active boolean,income_cents bigint,expense_cents bigint,balance_cents bigint,payment_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede consultar balances.' USING ERRCODE='42501'; END IF;
 IF month_start IS NULL OR extract(day FROM month_start)<>1 THEN RAISE EXCEPTION 'Indicá el primer día del mes.'; END IF;
 RETURN QUERY WITH receipts AS (
  SELECT c.branch_id,sum(c.amount_cents)::bigint AS income,count(*) AS count FROM public.cash_payments c
  WHERE c.voided_at IS NULL AND c.paid_at>=(month_start::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
   AND c.paid_at<((month_start+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') GROUP BY c.branch_id
 ), expenses AS (
  SELECT e.branch_id,sum(e.amount_cents)::bigint AS amount FROM public.branch_expenses e
  WHERE e.voided_at IS NULL AND e.paid_on>=month_start AND e.paid_on<(month_start+interval '1 month')::date GROUP BY e.branch_id
 ) SELECT b.id,b.name,b.active,coalesce(r.income,0),coalesce(e.amount,0),coalesce(r.income,0)-coalesce(e.amount,0),coalesce(r.count,0)
 FROM public.branches b LEFT JOIN receipts r ON r.branch_id=b.id LEFT JOIN expenses e ON e.branch_id=b.id ORDER BY b.name,b.id;
END $$;
REVOKE ALL ON FUNCTION public.audit_branch_expense(),public.record_branch_expense(uuid,text,text,bigint,date,text,uuid,text),public.void_branch_expense(uuid,text),public.get_branch_balances(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_branch_expense(uuid,text,text,bigint,date,text,uuid,text),public.void_branch_expense(uuid,text),public.get_branch_balances(date) TO authenticated;
COMMIT;
