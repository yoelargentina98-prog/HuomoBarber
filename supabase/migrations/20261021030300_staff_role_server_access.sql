BEGIN;

-- Auth creates a client profile first. create-staff then promotes that same
-- freshly created account using its server-only service_role connection.
-- SECURITY INVOKER is essential: current_user must be the actual SQL caller.
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'No se puede cambiar la identidad de un perfil.' USING ERRCODE = '42501';
  END IF;
  IF OLD.role IS DISTINCT FROM NEW.role
     AND current_user NOT IN ('postgres', 'service_role') THEN
    IF auth.uid() IS NOT DISTINCT FROM OLD.id OR public.is_admin() IS NOT TRUE THEN
      RAISE EXCEPTION 'Solo administración puede asignar roles a otras cuentas.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
