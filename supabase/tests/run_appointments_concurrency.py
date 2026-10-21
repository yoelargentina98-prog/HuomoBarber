"""Two independent PostgreSQL transactions through the authenticated Supabase CLI.

Uses an isolated QA branch/users, then removes only those UUIDs in finally.
Never changes real schedules, credentials, or booking settings. No email is sent.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import uuid

PROJECT = 'dnzvuwzpsfqduqdmfnmi'
branch, barber_a, barber_b, client_a, client_b, service = [str(uuid.uuid4()) for _ in range(6)]
users = ','.join(f"'{item}'::uuid" for item in [barber_a, barber_b, client_a, client_b])
tag = f'QA-CONCURRENCY-{branch}'
cli = 'npx.cmd' if os.name == 'nt' else 'npx'

with tempfile.TemporaryDirectory(prefix='huomo-booking-race-') as folder:
    def query(name, sql, required=True):
        path = Path(folder) / f'{name}.sql'
        path.write_text(sql, encoding='utf-8')
        result = subprocess.run([cli, '--yes', 'supabase', 'db', 'query', '--linked',
                                 '--project-ref', PROJECT, '--file', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
        if required and result.returncode:
            raise RuntimeError(f'{name}: {result.stderr}\n{result.stdout}')
        return result

    def rows(result):
        return json.loads(result.stdout[result.stdout.index('{'):])['rows']

    admin = "SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE role='admin' LIMIT 1),true);"
    setup = f"""BEGIN; {admin}
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ({users})) OR EXISTS(SELECT 1 FROM public.branches WHERE id='{branch}') THEN RAISE EXCEPTION 'QA UUID collision'; END IF;
    END $$;
    INSERT INTO auth.users(id,email,raw_user_meta_data) SELECT id,id||'@qa.invalid',jsonb_build_object('full_name','{tag}') FROM unnest(ARRAY[{users}]) id;
    INSERT INTO public.branches(id,name) VALUES('{branch}','{tag}');
    UPDATE public.profiles SET role='barber',branch_id='{branch}' WHERE id IN ('{barber_a}','{barber_b}');
    INSERT INTO public.service_catalog(id,name,category,duration_minutes) VALUES('{service}','{tag}','cut',30);
    INSERT INTO public.branch_services(branch_id,service_id,active,price_cents) VALUES('{branch}','{service}',true,2000000);
    INSERT INTO public.barber_services(employee_id,service_id) VALUES('{barber_a}','{service}'),('{barber_b}','{service}');
    INSERT INTO public.barber_schedules(employee_id,weekly) SELECT id,(SELECT jsonb_agg(jsonb_build_object('day',d,'intervals',jsonb_build_array(jsonb_build_object('start','09:00','end','22:00')))) FROM generate_series(0,6) d) FROM unnest(ARRAY['{barber_a}'::uuid,'{barber_b}'::uuid]) id;
    INSERT INTO public.branch_schedules(branch_id,weekly) SELECT '{branch}',weekly FROM public.barber_schedules WHERE employee_id='{barber_a}';
    COMMIT;"""
    cleanup = f"""BEGIN;
    DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.branches WHERE id='{branch}' AND name<>'{tag}') THEN RAISE EXCEPTION 'QA cleanup scope mismatch'; END IF; END $$;
    DELETE FROM public.appointments WHERE branch_id='{branch}';
    DELETE FROM public.barber_services WHERE employee_id IN ('{barber_a}','{barber_b}');
    DELETE FROM public.branch_services WHERE branch_id='{branch}';
    DELETE FROM public.service_catalog WHERE id='{service}' AND name='{tag}';
    DELETE FROM public.barber_schedules WHERE employee_id IN ('{barber_a}','{barber_b}');
    DELETE FROM public.branch_schedules WHERE branch_id='{branch}';
    DELETE FROM public.employee_audit WHERE employee_id IN ({users});
    DELETE FROM public.employee_details WHERE employee_id IN ({users});
    DELETE FROM public.profiles WHERE id IN ({users});
    DELETE FROM auth.users WHERE id IN ({users}) AND email LIKE '%@qa.invalid';
    DELETE FROM public.branches WHERE id='{branch}' AND name='{tag}';
    COMMIT; SELECT count(*) AS remaining FROM public.branches WHERE id='{branch}';"""

    def race(customer, barber, hour, name):
        sql = f"""BEGIN;
        SELECT set_config('request.jwt.claim.sub','{customer}',true); SET LOCAL ROLE authenticated;
        SELECT (public.book_appointment('{branch}','{service}','{barber}',(((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+1)+time '{hour}') AT TIME ZONE 'America/Argentina/Buenos_Aires','QA race','','','')).id;
        SELECT pg_sleep(2); COMMIT;"""
        return query(name, sql, required=False)

    ready = False
    try:
        query('setup', setup)
        ready = True
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(race, client_a, barber_a, '10:00', 'overlap-a'),
                       executor.submit(race, client_b, barber_a, '10:00', 'overlap-b')]
            results = [future.result() for future in futures]
        assert sorted(result.returncode for result in results) == [0, 1], 'Expected exactly one winner for the same interval'
        check = query('overlap-check', f"SELECT count(*) AS n FROM public.appointments WHERE branch_id='{branch}'")
        assert rows(check)[0]['n'] == 1
        print('PASS: same barber/interval, exactly one committed reservation')
        baseline = f"""BEGIN; {admin}
        DELETE FROM public.appointments WHERE branch_id='{branch}';
        INSERT INTO public.appointments(client_id,client_name,branch_id,barber_id,service_id,starts_at,ends_at,branch_name,barber_name,service_name,price_cents,duration_minutes,created_by)
        SELECT '{client_a}','QA baseline','{branch}','{barber_a}','{service}',t,t+interval '30 minutes','{tag}','QA','QA',2000000,30,auth.uid()
        FROM generate_series(1,(SELECT max_active_per_client-1 FROM public.booking_settings WHERE id)) n
        CROSS JOIN LATERAL (SELECT (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+2)+time '09:00'+(n-1)*interval '30 minutes') AT TIME ZONE 'America/Argentina/Buenos_Aires' AS t) x;
        COMMIT;"""
        query('limit-baseline', baseline)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(race, client_a, barber_a, '11:00', 'limit-a'),
                       executor.submit(race, client_a, barber_b, '11:00', 'limit-b')]
            results = [future.result() for future in futures]
        assert sorted(result.returncode for result in results) == [0, 1], 'Expected one winner across different barbers for the same client'
        check = query('limit-check', f"SELECT (SELECT count(*) FROM public.appointments WHERE client_id='{client_a}' AND status='confirmed')=(SELECT max_active_per_client FROM public.booking_settings WHERE id) AS valid")
        assert rows(check)[0]['valid'] is True
        print('PASS: one client/different barbers, active reservation limit preserved')
    finally:
        if ready:
            result = query('cleanup', cleanup)
            assert rows(result)[0]['remaining'] == 0
            print('PASS: isolated QA users/branch/reservations removed')
