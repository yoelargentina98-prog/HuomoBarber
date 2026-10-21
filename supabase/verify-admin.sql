-- Ejecutar en SQL Editor después de aplicar la migración. Solo lectura.
SELECT u.email, p.id, p.role, p.full_name
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE u.email = 'admin@huomobarber.com.ar';
-- Esperado: exactamente una fila con role = admin.

SELECT relrowsecurity AS rls_enabled
FROM pg_class
WHERE oid = 'public.profiles'::regclass;
-- Esperado: true.

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
-- Esperado: cuatro políticas, todas para authenticated.
