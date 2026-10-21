BEGIN;
CREATE FUNCTION public.get_cash_sale_setup(target_branch uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF target_branch IS NULL OR NOT public.can_access_cash_branch(target_branch) THEN
  RAISE EXCEPTION 'No tenés acceso a esta sucursal.' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
  'branchActive',coalesce((SELECT active FROM public.branches WHERE id=target_branch),false),
  'serviceCount',(SELECT count(*) FROM public.branch_services bs JOIN public.service_catalog s ON s.id=bs.service_id
   WHERE bs.branch_id=target_branch AND bs.active AND s.active AND bs.price_cents>0),
  'barbers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.full_name,p.username),'active',d.active,
   'enabledCount',(SELECT count(*) FROM public.barber_services a JOIN public.service_catalog s ON s.id=a.service_id
    JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=target_branch
    WHERE a.employee_id=p.id AND s.active AND bs.active AND bs.price_cents>0)) ORDER BY p.full_name,p.id)
   FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
   WHERE p.role='barber' AND p.branch_id=target_branch),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_cash_sale_setup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_sale_setup(uuid) TO authenticated;
COMMIT;
