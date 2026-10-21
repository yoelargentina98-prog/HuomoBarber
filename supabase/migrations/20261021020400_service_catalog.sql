BEGIN;
CREATE TABLE public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 100),
  description text NOT NULL DEFAULT '' CHECK(length(description)<=1000),
  category text NOT NULL DEFAULT 'other' CHECK(category IN ('cut','beard','other')),
  price_cents bigint NOT NULL CHECK(price_cents BETWEEN 0 AND 100000000000),
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 5 AND 1440),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX service_catalog_name_unique ON public.service_catalog(lower(btrim(name)));
CREATE TRIGGER service_catalog_updated BEFORE UPDATE ON public.service_catalog
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TABLE public.barber_services (
  employee_id uuid NOT NULL REFERENCES public.employee_details(employee_id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(employee_id,service_id)
);
CREATE INDEX barber_services_service_idx ON public.barber_services(service_id);
ALTER TABLE public.employee_services ADD COLUMN service_id uuid REFERENCES public.service_catalog(id) ON DELETE RESTRICT;
CREATE INDEX employee_services_catalog_idx ON public.employee_services(service_id);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_catalog,public.barber_services FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.service_catalog TO authenticated;
GRANT SELECT ON public.barber_services TO authenticated;
GRANT ALL ON public.service_catalog,public.barber_services TO service_role;
CREATE POLICY admin_read ON public.service_catalog FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY admin_insert ON public.service_catalog FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY admin_update ON public.service_catalog FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY admin_read ON public.barber_services FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

CREATE FUNCTION public.audit_barber_service() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE employee uuid; service uuid; label text; snapshot jsonb;
BEGIN
  IF TG_OP='DELETE' THEN employee:=OLD.employee_id; service:=OLD.service_id; snapshot:=to_jsonb(OLD);
  ELSE employee:=NEW.employee_id; service:=NEW.service_id; snapshot:=to_jsonb(NEW); END IF;
  SELECT name INTO label FROM public.service_catalog WHERE id=service;
  snapshot:=snapshot || jsonb_build_object('service_name',label);
  INSERT INTO public.employee_audit(employee_id,actor_id,entity,action,before_data,after_data)
  VALUES(employee,auth.uid(),'barber_services',TG_OP,
    CASE WHEN TG_OP='DELETE' THEN snapshot ELSE NULL END,
    CASE WHEN TG_OP='INSERT' THEN snapshot ELSE NULL END);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER barber_services_audit AFTER INSERT OR DELETE ON public.barber_services
FOR EACH ROW EXECUTE FUNCTION public.audit_barber_service();
REVOKE ALL ON FUNCTION public.audit_barber_service() FROM PUBLIC;

CREATE FUNCTION public.set_barber_services(target_employee uuid, service_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administración puede asignar servicios.' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.employee_details d JOIN public.profiles p ON p.id=d.employee_id
    WHERE d.employee_id=target_employee AND p.role='barber' FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo se asignan servicios a barberos existentes.'; END IF;
  IF service_ids IS NULL OR cardinality(service_ids)>500 THEN RAISE EXCEPTION 'Selección de servicios inválida.'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(service_ids) selected(id) LEFT JOIN public.service_catalog s ON s.id=selected.id
    WHERE s.id IS NULL OR (NOT s.active AND NOT EXISTS(SELECT 1 FROM public.barber_services b WHERE b.employee_id=target_employee AND b.service_id=s.id))) THEN
    RAISE EXCEPTION 'Solo podés asignar servicios existentes y activos del catálogo.';
  END IF;
  DELETE FROM public.barber_services WHERE employee_id=target_employee AND NOT(service_id=ANY(service_ids));
  INSERT INTO public.barber_services(employee_id,service_id)
    SELECT target_employee,id FROM unnest(service_ids) selected(id) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.set_barber_services(uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_barber_services(uuid,uuid[]) TO authenticated;
COMMIT;
