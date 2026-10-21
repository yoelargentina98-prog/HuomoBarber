-- Ficha laboral y remuneración. Importes en centavos ARS; solo administración.
BEGIN;
CREATE TABLE public.employee_details (
  employee_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  employee_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  hire_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_details(employee_id),
  effective_from date NOT NULL CHECK (extract(day FROM effective_from) = 1),
  commission_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_percent BETWEEN 0 AND 100),
  cut_percent numeric(5,2) CHECK (cut_percent BETWEEN 0 AND 100),
  beard_percent numeric(5,2) CHECK (beard_percent BETWEEN 0 AND 100),
  other_percent numeric(5,2) CHECK (other_percent BETWEEN 0 AND 100),
  monthly_fixed_cents bigint NOT NULL DEFAULT 0 CHECK (monthly_fixed_cents BETWEEN 0 AND 100000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, effective_from)
);
CREATE TABLE public.employee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_details(employee_id),
  service_name text NOT NULL CHECK (length(btrim(service_name)) BETWEEN 2 AND 100),
  category text NOT NULL CHECK (category IN ('cut', 'beard', 'other')),
  performed_at timestamptz NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 0 AND 100000000000),
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent BETWEEN 0 AND 100),
  commission_cents bigint GENERATED ALWAYS AS (round(amount_cents * commission_percent / 100)::bigint) STORED,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text
);
CREATE INDEX employee_services_period_idx ON public.employee_services(employee_id, performed_at DESC);
CREATE TABLE public.employee_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_details(employee_id),
  period date NOT NULL CHECK (extract(day FROM period) = 1),
  kind text NOT NULL CHECK (kind IN ('extra', 'bonus', 'deduction')),
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 100000000000),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 2 AND 300),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text
);
CREATE INDEX employee_adjustments_period_idx ON public.employee_adjustments(employee_id, period);
CREATE TABLE public.employee_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_id uuid,
  entity text NOT NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_audit_employee_idx ON public.employee_audit(employee_id, created_at DESC);

INSERT INTO public.employee_details(employee_id)
SELECT id FROM public.profiles WHERE role IN ('barber', 'reception');

-- Nuevas altas obtienen ficha automáticamente, incluida la Edge Function existente.
CREATE FUNCTION public.ensure_employee_details() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role IN ('barber', 'reception') THEN
    INSERT INTO public.employee_details(employee_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_employee_details AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_employee_details();

CREATE FUNCTION public.audit_employee_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.role NOT IN ('barber', 'reception') THEN RETURN NEW; END IF;
    target_id := NEW.id;
  ELSE
    target_id := NEW.employee_id;
  END IF;
  INSERT INTO public.employee_audit(employee_id, actor_id, entity, action, before_data, after_data)
  VALUES(target_id, auth.uid(), TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER details_audit AFTER INSERT OR UPDATE ON public.employee_details FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();
CREATE TRIGGER compensation_audit AFTER INSERT OR UPDATE ON public.employee_compensation FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();
CREATE TRIGGER services_audit AFTER INSERT OR UPDATE ON public.employee_services FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();
CREATE TRIGGER adjustments_audit AFTER INSERT OR UPDATE ON public.employee_adjustments FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();
CREATE TRIGGER profile_changes_audit AFTER UPDATE OF full_name, phone ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['employee_details','employee_compensation','employee_services','employee_adjustments','employee_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
    EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.is_admin()))', table_name);
  END LOOP;
END $$;
GRANT UPDATE(hire_date, notes) ON public.employee_details TO authenticated;
CREATE POLICY admin_update ON public.employee_details FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
GRANT INSERT, UPDATE ON public.employee_compensation TO authenticated;
CREATE POLICY admin_insert ON public.employee_compensation FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY admin_update ON public.employee_compensation FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
REVOKE ALL ON FUNCTION public.ensure_employee_details(), public.audit_employee_change() FROM PUBLIC;
COMMIT;
