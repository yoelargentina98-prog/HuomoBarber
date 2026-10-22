-- Manual destructive reset of people and performed work only.
-- Keeps administrators, branches, service definitions/prices/durations and opening hours.
BEGIN;
SET LOCAL lock_timeout='10s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id='66e60c75-6e47-4213-8740-cf22c7cfb51e' AND u.email='admin@huomobarber.com.ar' AND p.role='admin') THEN
  RAISE EXCEPTION 'Administrator verification failed. Reset aborted.';
 END IF;
END $$;
-- Freeze the records that must remain unchanged for exact before/after verification.
LOCK TABLE public.branches,public.service_catalog,public.branch_services,public.branch_schedules IN SHARE MODE;
CREATE TEMP TABLE preserved_configuration ON COMMIT DROP AS
 SELECT 'branches' AS name,coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') AS data FROM public.branches t
 UNION ALL SELECT 'catalog',coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') FROM public.service_catalog t
 UNION ALL SELECT 'prices',coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.branch_id,t.service_id),'[]') FROM public.branch_services t
 UNION ALL SELECT 'opening_hours',coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.branch_id),'[]') FROM public.branch_schedules t;

TRUNCATE TABLE public.appointments,public.cash_payments,public.employee_services,
 public.employee_adjustments,public.employee_compensation,public.employee_audit,
 public.employee_details,public.barber_services,public.barber_schedules,public.booking_blocks
 RESTART IDENTITY;
-- Preserve booking rules; remove a reference only if its actor is being deleted.
UPDATE public.booking_settings SET updated_by=NULL
 WHERE updated_by IN (SELECT id FROM public.profiles WHERE role<>'admin');
DELETE FROM auth.refresh_tokens WHERE user_id IN (
 SELECT u.id::text FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u.id AND p.role='admin'));
-- The profile cascade removes client/employee identities; internal Auth sessions cascade too.
DELETE FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u.id AND p.role='admin');

DO $$ DECLARE original jsonb; current_data jsonb; BEGIN
 SELECT jsonb_object_agg(name,data) INTO original FROM preserved_configuration;
 SELECT jsonb_build_object(
  'branches',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') FROM public.branches t),
  'catalog',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') FROM public.service_catalog t),
  'prices',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.branch_id,t.service_id),'[]') FROM public.branch_services t),
  'opening_hours',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.branch_id),'[]') FROM public.branch_schedules t)
 ) INTO current_data;
 IF original IS DISTINCT FROM current_data THEN RAISE EXCEPTION 'Preserved configuration changed. Reset aborted.'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE role<>'admin') OR EXISTS(
  SELECT 1 FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.role IS DISTINCT FROM 'admin'::public.app_role) THEN
  RAISE EXCEPTION 'Non-administrator account remains. Reset aborted.';
 END IF;
END $$;
COMMIT;
SELECT (SELECT count(*) FROM auth.users) AS users,
 (SELECT count(*) FROM public.profiles WHERE role<>'admin') AS other_profiles,
 (SELECT count(*) FROM public.employee_services) AS performed_services,
 (SELECT count(*) FROM public.cash_payments) AS payments,
 (SELECT count(*) FROM public.appointments) AS appointments,
 (SELECT count(*) FROM public.branches) AS branches,
 (SELECT count(*) FROM public.service_catalog) AS catalog_services,
 (SELECT count(*) FROM public.branch_services) AS branch_prices;
