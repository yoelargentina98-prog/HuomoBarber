BEGIN;
CREATE FUNCTION public.get_reception_team(target_branch uuid DEFAULT NULL)
RETURNS TABLE(id uuid,full_name text,username text,role public.app_role,active boolean,services text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE own_branch uuid;
BEGIN
 IF public.is_admin() THEN
  IF target_branch IS NULL THEN RAISE EXCEPTION 'Elegí una sucursal.'; END IF;
 ELSE
  SELECT p.branch_id INTO own_branch FROM public.profiles p WHERE p.id=auth.uid();
  IF NOT public.can_access_cash_branch(own_branch) OR (target_branch IS NOT NULL AND target_branch IS DISTINCT FROM own_branch) THEN
   RAISE EXCEPTION 'Solo podés consultar el equipo de tu sucursal.' USING ERRCODE='42501';
  END IF;
  target_branch:=own_branch;
 END IF;
 RETURN QUERY SELECT p.id,p.full_name,p.username,p.role,d.active,
 ARRAY(SELECT s.name FROM public.barber_services a JOIN public.service_catalog s ON s.id=a.service_id
 JOIN public.branch_services bs ON bs.service_id=s.id AND bs.branch_id=target_branch
 WHERE a.employee_id=p.id AND s.active AND bs.active ORDER BY s.name)
 FROM public.profiles p JOIN public.employee_details d ON d.employee_id=p.id
 WHERE p.branch_id=target_branch AND p.role IN ('barber','reception')
 ORDER BY d.active DESC,p.full_name,p.id LIMIT 1000;
END $$;
REVOKE ALL ON FUNCTION public.get_reception_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_team(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cash_operator() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE profile public.profiles; branch public.branches;
BEGIN
 SELECT * INTO profile FROM public.profiles WHERE id=auth.uid();
 IF profile.role='admin' THEN RETURN jsonb_build_object('role','admin','branchId',NULL,'branchName',NULL,'name',profile.full_name,'username',profile.username); END IF;
 IF profile.role IS DISTINCT FROM 'reception' THEN RAISE EXCEPTION 'Esta cuenta no tiene acceso a recepción.' USING ERRCODE='42501'; END IF;
 IF NOT public.can_access_cash_branch(profile.branch_id) THEN RAISE EXCEPTION 'La cuenta debe estar activa y tener una sucursal activa asignada.' USING ERRCODE='42501'; END IF;
 SELECT * INTO branch FROM public.branches WHERE id=profile.branch_id;
 RETURN jsonb_build_object('role','reception','branchId',branch.id,'branchName',branch.name,'name',profile.full_name,'username',profile.username);
END $$;
COMMIT;
