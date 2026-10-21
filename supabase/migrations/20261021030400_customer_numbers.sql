BEGIN;
ALTER TABLE public.profiles ADD COLUMN customer_number text UNIQUE
 CHECK(customer_number ~ '^([0-9]{5}|[0-9]{7,15})$');
CREATE SEQUENCE public.customer_number_seq MINVALUE 10000 MAXVALUE 99999 START 10000 NO CYCLE;
REVOKE ALL ON SEQUENCE public.customer_number_seq FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.assign_customer_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE digits text;
BEGIN
 IF NEW.role <> 'client' THEN NEW.customer_number:=NULL; RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.role='client' AND OLD.customer_number IS NOT NULL THEN
  NEW.customer_number:=OLD.customer_number; RETURN NEW;
 END IF;
 -- Serialize phone allocation, including concurrent Google/email registrations.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('huomo-customer-number',0));
 digits:=regexp_replace(coalesce(NEW.phone,''),'[^0-9]','','g');
 IF digits ~ '^[0-9]{7,15}$' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE customer_number=digits AND id<>NEW.id) THEN
  NEW.customer_number:=digits;
 ELSE
  NEW.customer_number:=nextval('public.customer_number_seq')::text;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_customer_number() FROM PUBLIC;
CREATE TRIGGER profiles_customer_number BEFORE INSERT OR UPDATE OF phone,role,customer_number ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.assign_customer_number();
UPDATE public.profiles SET customer_number=NULL WHERE role='client';
COMMENT ON COLUMN public.profiles.customer_number IS 'Immutable numeric HuomoClub identifier; initial phone or generated five digits. Not an authentication credential.';
COMMIT;
