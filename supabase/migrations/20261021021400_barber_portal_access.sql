BEGIN;
CREATE FUNCTION public.get_barber_portal() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 SELECT jsonb_build_object('id',p.id,'name',coalesce(p.full_name,p.username),'username',p.username,'branchName',b.name)
 INTO result FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
 LEFT JOIN public.branches b ON b.id=p.branch_id
 WHERE p.id=auth.uid() AND p.role='barber' AND d.active;
 IF result IS NULL THEN RAISE EXCEPTION 'Esta cuenta no es un barbero activo.' USING ERRCODE='42501'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_barber_portal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_barber_portal() TO authenticated;
COMMIT;
