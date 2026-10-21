BEGIN;
ALTER TABLE public.employee_services ADD COLUMN client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_services ADD COLUMN customer_number text;
CREATE INDEX employee_services_client_history ON public.employee_services(client_id,performed_at DESC,id) WHERE voided_at IS NULL;

CREATE FUNCTION public.lookup_club_client(client_number text,target_branch uuid)
RETURNS TABLE(id uuid,full_name text,customer_number text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.can_access_cash_branch(target_branch) THEN RAISE EXCEPTION 'Sin acceso a la sucursal.' USING ERRCODE='42501'; END IF;
 IF client_number !~ '^[0-9]{5,15}$' THEN RAISE EXCEPTION 'Ingresá solo los dígitos del número de cliente.'; END IF;
 RETURN QUERY SELECT p.id,p.full_name,p.customer_number FROM public.profiles p WHERE p.role='client' AND p.customer_number=client_number;
END $$;

-- Retain the existing atomic price, commission, payment and replay validations.
ALTER FUNCTION public.register_cash_sale(uuid,uuid,uuid,text,bigint,uuid,text,text) RENAME TO register_cash_sale_without_client;
REVOKE ALL ON FUNCTION public.register_cash_sale_without_client(uuid,uuid,uuid,text,bigint,uuid,text,text) FROM PUBLIC,authenticated;
CREATE FUNCTION public.register_cash_sale(target_branch uuid,target_employee uuid,catalog_service uuid,
 payment_method text,expected_cents bigint,operation_id uuid,payment_reference text DEFAULT '',sale_notes text DEFAULT '',target_client_number text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person uuid; number text:=nullif(btrim(target_client_number),''); receipt uuid; job uuid; prior uuid;
BEGIN
 IF NOT public.can_access_cash_branch(target_branch) THEN RAISE EXCEPTION 'Sin acceso a la sucursal.' USING ERRCODE='42501'; END IF;
 IF operation_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador de venta.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(operation_id::text,0));
 IF number IS NOT NULL THEN
  SELECT p.id INTO person FROM public.profiles p WHERE p.customer_number=number AND p.role='client' FOR SHARE;
  IF person IS NULL THEN RAISE EXCEPTION 'No existe un cliente con ese número. Verificá el dato.'; END IF;
 END IF;
 SELECT c.id INTO prior FROM public.cash_payments c WHERE c.request_id=operation_id;
 IF prior IS NOT NULL AND EXISTS(SELECT 1 FROM public.cash_payments c JOIN public.employee_services s ON s.id=c.service_id WHERE c.id=prior AND s.client_id IS DISTINCT FROM person) THEN
  RAISE EXCEPTION 'Este intento ya corresponde a otro cliente.';
 END IF;
 receipt:=public.register_cash_sale_without_client(target_branch,target_employee,catalog_service,payment_method,expected_cents,operation_id,payment_reference,sale_notes);
 IF prior IS NULL AND person IS NOT NULL THEN
  SELECT c.service_id INTO job FROM public.cash_payments c WHERE c.id=receipt;
  UPDATE public.employee_services SET client_id=person,customer_number=number WHERE id=job;
 END IF;
 RETURN receipt;
END $$;

-- Services completed from an existing booking inherit its registered client.
CREATE FUNCTION public.link_service_booking_client() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.appointment_id IS NOT NULL THEN
  SELECT a.client_id,p.customer_number INTO NEW.client_id,NEW.customer_number
  FROM public.appointments a LEFT JOIN public.profiles p ON p.id=a.client_id WHERE a.id=NEW.appointment_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER employee_service_client BEFORE INSERT ON public.employee_services FOR EACH ROW EXECUTE FUNCTION public.link_service_booking_client();
UPDATE public.employee_services s SET client_id=a.client_id,customer_number=p.customer_number
 FROM public.appointments a JOIN public.profiles p ON p.id=a.client_id WHERE s.appointment_id=a.id;

CREATE FUNCTION public.get_club_history(target_client uuid DEFAULT NULL,page_number integer DEFAULT 0,target_branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE person uuid:=coalesce(target_client,auth.uid()); scoped_branch uuid; rows jsonb; total bigint; stats jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=person AND role='client') THEN RAISE EXCEPTION 'Cliente no disponible.' USING ERRCODE='42501'; END IF;
 IF public.is_admin() THEN scoped_branch:=target_branch;
 ELSIF person=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='client') THEN scoped_branch:=NULL;
 ELSIF target_branch IS NOT NULL AND public.can_access_cash_branch(target_branch) THEN scoped_branch:=target_branch;
 ELSE RAISE EXCEPTION 'Sin permiso para ver el historial.' USING ERRCODE='42501'; END IF;
 IF page_number IS NULL OR page_number<0 OR page_number>100000 THEN RAISE EXCEPTION 'Página inválida.'; END IF;
 SELECT count(*) INTO total FROM public.employee_services s WHERE s.client_id=person AND s.voided_at IS NULL AND (scoped_branch IS NULL OR s.branch_id=scoped_branch);
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.performed_at DESC,t.id),'[]') INTO rows FROM (
  SELECT s.id,s.service_name,s.branch_name,s.performed_at,s.amount_cents,coalesce(p.full_name,'Barbero') AS barber_name
  FROM public.employee_services s LEFT JOIN public.profiles p ON p.id=s.employee_id
  WHERE s.client_id=person AND s.voided_at IS NULL AND (scoped_branch IS NULL OR s.branch_id=scoped_branch)
  ORDER BY s.performed_at DESC,s.id LIMIT 20 OFFSET page_number*20) t;
 SELECT jsonb_build_object('services',count(*),'spentCents',coalesce(sum(s.amount_cents),0),'lastVisit',max(s.performed_at),
  'visitDays',count(DISTINCT (s.performed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)) INTO stats
 FROM public.employee_services s WHERE s.client_id=person AND s.voided_at IS NULL AND (scoped_branch IS NULL OR s.branch_id=scoped_branch);
 RETURN jsonb_build_object('rows',rows,'total',total,'summary',stats);
END $$;
REVOKE ALL ON FUNCTION public.link_service_booking_client(),public.lookup_club_client(text,uuid),public.get_club_history(uuid,integer,uuid),public.register_cash_sale(uuid,uuid,uuid,text,bigint,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_club_client(text,uuid),public.get_club_history(uuid,integer,uuid),public.register_cash_sale(uuid,uuid,uuid,text,bigint,uuid,text,text,text) TO authenticated;
COMMIT;
