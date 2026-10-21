-- End-to-end database rules, all changes rolled back, no real customer data.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);
DO $$
DECLARE branch uuid:=gen_random_uuid(); other_branch uuid:=gen_random_uuid(); barber uuid:=gen_random_uuid(); second_barber uuid:=gen_random_uuid();
 customer uuid:=gen_random_uuid(); other_customer uuid:=gen_random_uuid(); receptionist uuid:=gen_random_uuid(); service uuid:=gen_random_uuid();
 day_date date:=(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+1; weekly jsonb; manual public.appointments; occupied public.appointments; booked public.appointments;
 past uuid:=gen_random_uuid(); result jsonb; retry jsonb; operation uuid:=gen_random_uuid(); count_before integer; admin_id uuid:=auth.uid();
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (barber,barber||'@qa.invalid','{"full_name":"QA barber"}'),(second_barber,second_barber||'@qa.invalid','{"full_name":"QA second"}'),
 (customer,customer||'@qa.invalid','{"full_name":"QA customer","role":"admin"}'),(other_customer,other_customer||'@qa.invalid','{"full_name":"QA other"}'),
 (receptionist,receptionist||'@qa.invalid','{"full_name":"QA reception"}');
 IF (SELECT role FROM public.profiles WHERE id=customer)<>'client' THEN RAISE EXCEPTION 'Public registration elevated role'; END IF;
 INSERT INTO public.branches(id,name) VALUES(branch,'QA appointments '||branch),(other_branch,'QA other '||other_branch);
 UPDATE public.profiles SET role='barber',branch_id=branch WHERE id IN (barber,second_barber);
 UPDATE public.profiles SET role='reception',branch_id=other_branch WHERE id=receptionist;
 INSERT INTO public.employee_details(employee_id) VALUES(barber),(second_barber),(receptionist) ON CONFLICT DO NOTHING;
 INSERT INTO public.employee_compensation(employee_id,effective_from,commission_percent,monthly_fixed_cents) VALUES(barber,date_trunc('month',now())::date,30,0),(second_barber,date_trunc('month',now())::date,30,0);
 INSERT INTO public.service_catalog(id,name,category,duration_minutes) VALUES(service,'QA service '||service,'cut',30);
 INSERT INTO public.branch_services(branch_id,service_id,active,price_cents) VALUES(branch,service,true,2000000);
 INSERT INTO public.barber_services(employee_id,service_id) VALUES(barber,service),(second_barber,service);
 SELECT jsonb_agg(jsonb_build_object('day',d,'intervals',jsonb_build_array(jsonb_build_object('start','09:00','end','13:00')))) INTO weekly FROM generate_series(0,6) d;
 PERFORM public.save_barber_schedule(barber,weekly,'[]',0); PERFORM public.save_barber_schedule(second_barber,weekly,'[]',0);
 IF EXISTS(SELECT 1 FROM public.get_available_booking_slots(branch,service,barber,day_date)) THEN RAISE EXCEPTION 'Missing opening hours allowed bookings'; END IF;
 SELECT jsonb_agg(jsonb_build_object('day',d,'intervals',jsonb_build_array(jsonb_build_object('start','10:00','end','12:00')))) INTO weekly FROM generate_series(0,6) d;
 PERFORM public.save_branch_schedule(branch,weekly,'[]',0);
 IF (SELECT count(*) FROM public.get_available_booking_slots(branch,service,barber,day_date))<>4 THEN RAISE EXCEPTION 'Branch/barber hours not intersected'; END IF;
 PERFORM public.save_booking_block(branch,NULL,(day_date+time '10:30') AT TIME ZONE 'America/Argentina/Buenos_Aires',(day_date+time '11:00') AT TIME ZONE 'America/Argentina/Buenos_Aires','QA closed period');
 IF (SELECT count(*) FROM public.get_available_booking_slots(branch,service,barber,day_date))<>3 THEN RAISE EXCEPTION 'Branch block ignored'; END IF;
 INSERT INTO public.appointments(id,client_id,client_name,branch_id,barber_id,service_id,starts_at,ends_at,branch_name,barber_name,service_name,price_cents,duration_minutes,created_by)
 VALUES(past,customer,'QA customer',branch,barber,service,now()-interval '2 hours',now()-interval '90 minutes','QA','QA','QA',2000000,30,admin_id);
 PERFORM set_config('role','authenticated',true);
 manual:=public.book_appointment(branch,service,barber,(day_date+time '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires','Walk-in QA','','','');
 IF manual.client_id IS NOT NULL OR manual.created_by<>admin_id THEN RAISE EXCEPTION 'Manual reservation incorrectly assigned to operator'; END IF;
 BEGIN
  PERFORM public.book_appointment(branch,service,barber,manual.starts_at,'Overlap QA','','','');
  RAISE EXCEPTION 'Overlap allowed' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception OR exclusion_violation THEN NULL; END;
 UPDATE public.service_catalog SET duration_minutes=60 WHERE id=service;
 manual:=public.reschedule_appointment(manual.id,(day_date+time '11:00') AT TIME ZONE 'America/Argentina/Buenos_Aires');
 IF manual.ends_at-manual.starts_at<>interval '30 minutes' OR manual.price_cents<>2000000 THEN RAISE EXCEPTION 'Historical snapshots changed'; END IF;
 UPDATE public.service_catalog SET duration_minutes=30 WHERE id=service;
 occupied:=public.book_appointment(branch,service,barber,(day_date+time '11:30') AT TIME ZONE 'America/Argentina/Buenos_Aires','Occupied QA','','','');
 BEGIN
  PERFORM public.reschedule_appointment(manual.id,occupied.starts_at);
  RAISE EXCEPTION 'Reschedule overlap allowed' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception OR exclusion_violation THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=manual.id AND starts_at=manual.starts_at AND status='confirmed') THEN RAISE EXCEPTION 'Failed reschedule lost old booking'; END IF;
 BEGIN
  PERFORM public.complete_appointment_service(manual.id,'cash');
  RAISE EXCEPTION 'Future service completed' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 result:=public.complete_appointment_service(past,'transfer','QA reference','',operation);
 retry:=public.complete_appointment_service(past,'transfer','QA reference','',operation);
 IF result<>retry OR (SELECT count(*) FROM public.employee_services WHERE appointment_id=past)<>1 OR (SELECT count(*) FROM public.cash_payments WHERE request_id=operation)<>1 THEN RAISE EXCEPTION 'Duplicate completion/payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.employee_services WHERE appointment_id=past AND category='cut' AND commission_cents=600000) THEN RAISE EXCEPTION 'Wrong commission/category'; END IF;
 PERFORM public.save_booking_settings(0,30,0,1);
 PERFORM set_config('request.jwt.claim.sub',customer::text,true);
 booked:=public.book_appointment(branch,service,barber,(day_date+time '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires','QA customer','','','');
 IF booked.client_id<>customer THEN RAISE EXCEPTION 'Customer booking has no owner'; END IF;
 BEGIN
  PERFORM public.book_appointment(branch,service,second_barber,(day_date+time '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires','QA customer','','','');
  RAISE EXCEPTION 'Customer booking limit ignored' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.appointments WHERE id=manual.id) THEN RAISE EXCEPTION 'Client read manual reservation'; END IF;
 BEGIN
  UPDATE public.profiles SET role='admin' WHERE id=customer;
  RAISE EXCEPTION 'Client elevated own role' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception OR insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',other_customer::text,true);
 BEGIN
  PERFORM public.cancel_appointment(booked.id,'Not my booking');
  RAISE EXCEPTION 'Client cancelled another booking' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',receptionist::text,true);
 IF EXISTS(SELECT 1 FROM public.appointments WHERE branch_id=branch) THEN RAISE EXCEPTION 'Reception read another branch'; END IF;
 BEGIN
  PERFORM public.complete_appointment_service(past,'transfer','QA reference','',operation);
  RAISE EXCEPTION 'Reception completed another branch' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',barber::text,true);
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=manual.id) OR EXISTS(SELECT 1 FROM public.appointments WHERE barber_id<>barber) THEN RAISE EXCEPTION 'Barber scope invalid'; END IF;
 PERFORM set_config('request.jwt.claim.sub',customer::text,true);
 PERFORM public.cancel_appointment(booked.id,'QA cancel');
END $$;
ROLLBACK;

