BEGIN;
CREATE TABLE public.branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 100),
 address text NOT NULL DEFAULT '' CHECK(length(address)<=300),
 phone text NOT NULL DEFAULT '' CHECK(length(phone)<=30),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX branches_name_unique ON public.branches(lower(btrim(name)));
CREATE TRIGGER branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
INSERT INTO public.branches(name) VALUES('Irigoyen'),('Mosconi');
ALTER TABLE public.profiles ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;
CREATE INDEX profiles_branch_idx ON public.profiles(branch_id);
ALTER TABLE public.employee_services ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;
ALTER TABLE public.employee_services ADD COLUMN branch_name text;
CREATE INDEX employee_services_branch_idx ON public.employee_services(branch_id,performed_at);
ALTER TABLE public.service_catalog ALTER COLUMN price_cents SET DEFAULT 0;
COMMENT ON COLUMN public.service_catalog.price_cents IS 'Legado, no es tarifa vigente. Usar branch_services.price_cents.';
CREATE TABLE public.branch_services (
 branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
 price_cents bigint CHECK(price_cents BETWEEN 0 AND 100000000000),
 active boolean NOT NULL DEFAULT false,
 PRIMARY KEY(branch_id,service_id),
 CHECK(NOT active OR price_cents IS NOT NULL)
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_services ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.branches,public.branch_services FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.branches TO authenticated;
GRANT SELECT ON public.branch_services TO authenticated;
GRANT ALL ON public.branches,public.branch_services TO service_role;
CREATE POLICY admin_read ON public.branches FOR SELECT TO authenticated USING((SELECT public.is_admin()));
CREATE POLICY admin_insert ON public.branches FOR INSERT TO authenticated WITH CHECK((SELECT public.is_admin()));
CREATE POLICY admin_update ON public.branches FOR UPDATE TO authenticated USING((SELECT public.is_admin())) WITH CHECK((SELECT public.is_admin()));
CREATE POLICY admin_read ON public.branch_services FOR SELECT TO authenticated USING((SELECT public.is_admin()));

CREATE FUNCTION public.validate_employee_branch() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.role='barber' AND NEW.branch_id IS NULL THEN RAISE EXCEPTION 'El barbero debe pertenecer a una sucursal.'; END IF;
 IF NEW.branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branches WHERE id=NEW.branch_id AND active) THEN RAISE EXCEPTION 'Elegí una sucursal activa.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER profiles_branch_valid BEFORE INSERT OR UPDATE OF branch_id,role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_employee_branch();

CREATE FUNCTION public.save_employee_branch(target_employee uuid,target_branch uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede asignar sucursales.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.employee_details WHERE employee_id=target_employee FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_employee AND role IN ('barber','reception')) THEN RAISE EXCEPTION 'Empleado no encontrado.'; END IF;
 UPDATE public.profiles SET branch_id=target_branch WHERE id=target_employee;
 DELETE FROM public.barber_services b WHERE b.employee_id=target_employee AND NOT EXISTS(
   SELECT 1 FROM public.branch_services s WHERE s.branch_id=target_branch AND s.service_id=b.service_id AND s.active AND s.price_cents IS NOT NULL);
END $$;
CREATE TRIGGER profile_branch_audit AFTER UPDATE OF branch_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_employee_change();
CREATE FUNCTION public.save_service_branch_prices(target_service uuid, prices jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE entry jsonb; BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede configurar precios.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_catalog WHERE id=target_service) THEN RAISE EXCEPTION 'Servicio inexistente.'; END IF;
 IF jsonb_typeof(prices)<>'array' OR jsonb_array_length(prices)>500 THEN RAISE EXCEPTION 'Configuración inválida.'; END IF;
 FOR entry IN SELECT * FROM jsonb_array_elements(prices) LOOP
   IF NOT EXISTS(SELECT 1 FROM public.branches WHERE id=(entry->>'branch_id')::uuid AND active) THEN RAISE EXCEPTION 'La sucursal no existe o está inactiva.'; END IF;
   IF entry->>'active' IS NULL THEN RAISE EXCEPTION 'Indicá disponibilidad.'; END IF;
   INSERT INTO public.branch_services(branch_id,service_id,price_cents,active)
   VALUES((entry->>'branch_id')::uuid,target_service,(entry->>'price_cents')::bigint,(entry->>'active')::boolean)
   ON CONFLICT(branch_id,service_id) DO UPDATE SET price_cents=excluded.price_cents,active=excluded.active;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.save_employee_branch(uuid,uuid),public.save_service_branch_prices(uuid,jsonb),public.validate_employee_branch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_employee_branch(uuid,uuid),public.save_service_branch_prices(uuid,jsonb) TO authenticated;
COMMIT;
