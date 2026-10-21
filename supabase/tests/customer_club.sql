-- Isolated fixtures; every row is rolled back. Sequence gaps are intentional.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE b uuid:=gen_random_uuid(); other_b uuid:=gen_random_uuid(); barber uuid:=gen_random_uuid(); reception uuid:=gen_random_uuid();
 c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); c3 uuid:=gen_random_uuid(); svc uuid:=gen_random_uuid();
 number1 text;number2 text;number3 text; receipt uuid; retry uuid; op uuid:=gen_random_uuid(); admin_id uuid:=auth.uid(); history jsonb; initial_count bigint;
BEGIN
 INSERT INTO public.branches(id,name) VALUES(b,'QA Club '||b),(other_b,'QA Other '||other_b);
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (c1,c1||'@qa.invalid','{"phone":"11 9999-1234","role":"admin","customer_number":"99999"}'),
 (c2,c2||'@qa.invalid','{}'),(c3,c3||'@qa.invalid','{"phone":"11 9999-1234"}'),
 (barber,barber||'@qa.invalid','{}'),(reception,reception||'@qa.invalid','{}');
 SELECT customer_number INTO number1 FROM public.profiles WHERE id=c1;
 SELECT customer_number INTO number2 FROM public.profiles WHERE id=c2;
 SELECT customer_number INTO number3 FROM public.profiles WHERE id=c3;
 IF number1<>'1199991234' OR number2 !~ '^[0-9]{5}$' OR number3 !~ '^[0-9]{5}$' OR number2=number3 THEN RAISE EXCEPTION 'Invalid phone, fallback or duplicate allocation'; END IF;
 IF (SELECT role FROM public.profiles WHERE id=c1)<>'client' THEN RAISE EXCEPTION 'Signup elevated role'; END IF;
 UPDATE public.profiles SET phone='1188884321',customer_number='12345' WHERE id=c1;
 IF (SELECT customer_number FROM public.profiles WHERE id=c1)<>number1 THEN RAISE EXCEPTION 'Customer number changed'; END IF;
 UPDATE public.profiles SET role='barber',branch_id=b WHERE id=barber;
 UPDATE public.profiles SET role='reception',branch_id=other_b WHERE id=reception;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=barber AND customer_number IS NOT NULL) THEN RAISE EXCEPTION 'Employee kept club number'; END IF;
 INSERT INTO public.employee_compensation(employee_id,effective_from,commission_percent) VALUES(barber,date_trunc('month',now())::date,30);
 INSERT INTO public.service_catalog(id,name,category,duration_minutes) VALUES(svc,'QA Club Service','cut',30);
 INSERT INTO public.branch_services(branch_id,service_id,active,price_cents) VALUES(b,svc,true,2000000);
 INSERT INTO public.barber_services(employee_id,service_id) VALUES(barber,svc);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT 1 FROM public.lookup_club_client(number1,b) WHERE id=c1) THEN RAISE EXCEPTION 'Lookup failed'; END IF;
 receipt:=public.register_cash_sale(b,barber,svc,'cash',2000000,op,'','',number1);
 retry:=public.register_cash_sale(b,barber,svc,'cash',2000000,op,'','',number1);
 IF receipt<>retry OR (SELECT count(*) FROM public.employee_services WHERE client_id=c1)<>1 THEN RAISE EXCEPTION 'Replay duplicated service'; END IF;
 BEGIN
  PERFORM public.register_cash_sale(b,barber,svc,'cash',2000000,op,'','',number2);
  RAISE EXCEPTION 'Replay changed client' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 initial_count:=(SELECT count(*) FROM public.employee_services);
 BEGIN
  PERFORM public.register_cash_sale(b,barber,svc,'cash',2000000,gen_random_uuid(),'','','00000');
  RAISE EXCEPTION 'Unknown client accepted' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF (SELECT count(*) FROM public.employee_services)<>initial_count THEN RAISE EXCEPTION 'Unknown number persisted sale'; END IF;
 PERFORM public.register_cash_sale(b,barber,svc,'transfer',2000000,gen_random_uuid());
 IF (SELECT count(*) FROM public.employee_services WHERE client_id IS NULL)<>1 THEN RAISE EXCEPTION 'Occasional customer linked incorrectly'; END IF;
 history:=public.get_club_history(c1,0);
 IF (history->>'total')::int<>1 OR (history->'summary'->>'spentCents')::bigint<>2000000 THEN RAISE EXCEPTION 'Admin history incorrect'; END IF;
 PERFORM set_config('request.jwt.claim.sub',c1::text,true);
 history:=public.get_club_history();
 IF (history->>'total')::int<>1 THEN RAISE EXCEPTION 'Own history incorrect'; END IF;
 BEGIN
  PERFORM public.get_club_history(c2,0);
  RAISE EXCEPTION 'Client read another history' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.lookup_club_client(number2,b);
  RAISE EXCEPTION 'Client enumerated membership' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',reception::text,true);
 BEGIN
  PERFORM public.lookup_club_client(number1,b);
  RAISE EXCEPTION 'Reception accessed foreign branch' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 history:=public.get_club_history(c1,0,other_b);
 IF (history->>'total')::int<>0 THEN RAISE EXCEPTION 'Reception read foreign services'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 -- Paging: 21 more services, exactly 20 rows on page one.
 EXECUTE 'RESET ROLE';
 INSERT INTO public.employee_services(employee_id,service_name,category,performed_at,amount_cents,commission_percent,recorded_by,branch_id,client_id)
 SELECT barber,'QA page','cut',now()-n*interval '1 day',100,30,admin_id,b,c1 FROM generate_series(1,21) n;
 history:=public.get_club_history(c1,0);
 IF jsonb_array_length(history->'rows')<>20 OR (history->>'total')::int<>22 THEN RAISE EXCEPTION 'Paging limit invalid'; END IF;
 history:=public.get_club_history(c1,1);
 IF jsonb_array_length(history->'rows')<>2 THEN RAISE EXCEPTION 'Second page invalid'; END IF;
END $$;
ROLLBACK;
