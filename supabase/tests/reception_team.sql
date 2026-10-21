BEGIN;
DO $$
DECLARE reception_a uuid:=gen_random_uuid(); reception_b uuid:=gen_random_uuid(); inactive_rec uuid:=gen_random_uuid(); barber uuid:=gen_random_uuid(); branch_a uuid; branch_b uuid; found record;
BEGIN
 SELECT id INTO branch_a FROM public.branches WHERE name='Irigoyen';
 SELECT id INTO branch_b FROM public.branches WHERE name='Mosconi';
 INSERT INTO auth.users(id,email) SELECT id,id::text||'@test.invalid' FROM unnest(ARRAY[reception_a,reception_b,inactive_rec,barber]) id;
 INSERT INTO public.profiles(id,role,branch_id,full_name) VALUES
 (reception_a,'reception',branch_a,'Prueba recepción A'),(reception_b,'reception',branch_b,'Prueba recepción B'),
 (inactive_rec,'reception',branch_a,'Prueba recepción inactiva'),(barber,'barber',branch_a,'Prueba barbero A');
 UPDATE public.employee_details SET active=false WHERE employee_id=inactive_rec;
 PERFORM set_config('request.jwt.claim.sub',reception_a::text,true);
 PERFORM set_config('role','authenticated',true);
 IF NOT EXISTS(SELECT 1 FROM public.get_reception_team(NULL) WHERE id=barber) THEN RAISE EXCEPTION 'No se mostró barbero de la sucursal'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.get_reception_team(branch_a) WHERE id=reception_a AND role='reception') THEN RAISE EXCEPTION 'No se mostró recepción'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_reception_team(NULL) WHERE id=reception_b) THEN RAISE EXCEPTION 'Se expuso otra sucursal'; END IF;
 SELECT * INTO found FROM public.get_reception_team(NULL) WHERE id=barber;
 IF to_jsonb(found) ? 'commission_percent' OR to_jsonb(found) ? 'monthly_fixed_cents' THEN RAISE EXCEPTION 'Se expusieron remuneraciones'; END IF;
 BEGIN
  PERFORM public.get_reception_team(branch_b);
  RAISE EXCEPTION 'Se pudo elegir otra sucursal' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',inactive_rec::text,true);
 BEGIN
  PERFORM public.get_reception_team(branch_a);
  RAISE EXCEPTION 'Se permitió recepción inactiva' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',barber::text,true);
 BEGIN
  PERFORM public.get_reception_team(branch_a);
  RAISE EXCEPTION 'Se permitió rol barbero' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
