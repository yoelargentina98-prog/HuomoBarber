-- Regression: same Auth -> profile UPSERT sequence used by create-staff.
-- No passwords, emails or production changes; fixtures are rolled back.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES ('b6b7c119-338d-4be6-bde9-c943de27baf0','qa-staff-regression@staff.huomo.invalid','{"role":"admin"}');
DO $$ BEGIN
 IF (SELECT role FROM public.profiles WHERE id='b6b7c119-338d-4be6-bde9-c943de27baf0') <> 'client' THEN
  RAISE EXCEPTION 'Public signup elevated a role';
 END IF;
END $$;
SET LOCAL ROLE service_role;
INSERT INTO public.profiles(id,username,full_name,phone,role,branch_id)
SELECT 'b6b7c119-338d-4be6-bde9-c943de27baf0','qa-staff-regression','QA regression','','barber',id
FROM public.branches WHERE active ORDER BY id LIMIT 1
ON CONFLICT(id) DO UPDATE SET username=excluded.username,full_name=excluded.full_name,
 phone=excluded.phone,role=excluded.role,branch_id=excluded.branch_id;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.employee_details e ON e.employee_id=p.id
  WHERE p.id='b6b7c119-338d-4be6-bde9-c943de27baf0' AND p.role='barber' AND p.branch_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Staff profile or employee file missing';
 END IF;
END $$;
UPDATE public.profiles SET role='reception' WHERE id='b6b7c119-338d-4be6-bde9-c943de27baf0';
RESET ROLE;
-- Isolate the trigger check from column grants. This grant is rolled back too.
GRANT UPDATE(role) ON public.profiles TO authenticated;
SELECT set_config('request.jwt.claim.sub','b6b7c119-338d-4be6-bde9-c943de27baf0',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  UPDATE public.profiles SET role='admin' WHERE id='b6b7c119-338d-4be6-bde9-c943de27baf0';
  RAISE EXCEPTION 'Self elevation was not rejected';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT role FROM public.profiles WHERE id='b6b7c119-338d-4be6-bde9-c943de27baf0') <> 'reception' THEN
  RAISE EXCEPTION 'Staff role changed unexpectedly';
 END IF;
END $$;
ROLLBACK;
