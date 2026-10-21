-- Destructive reset. Run explicitly, never as a deployment migration.
-- Keeps only admin@huomobarber.com.ar; removes branches too.
-- Preserves schema, permissions, Auth providers and default booking rules.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
   WHERE u.id='66e60c75-6e47-4213-8740-cf22c7cfb51e'
   AND u.email='admin@huomobarber.com.ar' AND p.role='admin') THEN
  RAISE EXCEPTION 'Administrator identity was not verified. Reset aborted.';
 END IF;
END $$;

-- Explicit table set, no CASCADE: unexpected dependencies abort the transaction.
TRUNCATE TABLE
 public.appointments, public.barber_schedules, public.barber_services,
 public.booking_blocks, public.booking_settings,
 public.branch_expense_audit, public.branch_expenses, public.branch_schedules,
 public.branch_services, public.cash_payments, public.employee_adjustments,
 public.employee_audit, public.employee_compensation, public.employee_details,
 public.employee_services, public.service_catalog
 RESTART IDENTITY;

DELETE FROM public.profiles WHERE id <> '66e60c75-6e47-4213-8740-cf22c7cfb51e';
UPDATE public.profiles SET branch_id=NULL
 WHERE id='66e60c75-6e47-4213-8740-cf22c7cfb51e' AND branch_id IS NOT NULL;
DELETE FROM public.branches;
-- Refresh tokens use a text user_id rather than a user foreign key.
DELETE FROM auth.refresh_tokens WHERE user_id IS DISTINCT FROM '66e60c75-6e47-4213-8740-cf22c7cfb51e';
-- Identities, sessions and MFA for removed users cascade from Auth.
DELETE FROM auth.users WHERE id <> '66e60c75-6e47-4213-8740-cf22c7cfb51e';
INSERT INTO public.booking_settings(id) VALUES(true);

DO $$
DECLARE relation_name text; remaining bigint;
BEGIN
 IF (SELECT count(*) FROM auth.users) <> 1 OR (SELECT count(*) FROM public.profiles) <> 1 THEN
  RAISE EXCEPTION 'Unexpected accounts remain. Reset aborted.';
 END IF;
 FOR relation_name IN SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE'
  AND table_name NOT IN ('profiles','booking_settings') LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',relation_name) INTO remaining;
  IF remaining <> 0 THEN RAISE EXCEPTION 'Unexpected data in %. Reset aborted.',relation_name; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE p.id='66e60c75-6e47-4213-8740-cf22c7cfb51e' AND p.role='admin' AND u.email='admin@huomobarber.com.ar') THEN
  RAISE EXCEPTION 'Administrator verification failed. Reset aborted.';
 END IF;
END $$;
COMMIT;

SELECT (SELECT count(*) FROM auth.users) AS auth_users,
 (SELECT count(*) FROM public.profiles) AS profiles,
 (SELECT count(*) FROM public.branches) AS branches,
 (SELECT count(*) FROM public.appointments) AS appointments,
 (SELECT count(*) FROM public.employee_services) AS services,
 (SELECT count(*) FROM public.cash_payments) AS payments;
