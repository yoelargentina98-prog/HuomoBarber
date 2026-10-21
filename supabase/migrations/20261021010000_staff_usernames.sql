-- Aplicar después de create_profiles_and_roles. No crea empleados automáticamente.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9][a-z0-9._-]{2,39}$');

-- Solo el servidor administra la identidad de acceso. Los permisos de columna
-- complementan RLS y evitan cambiar username/id desde un cliente autenticado.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
COMMENT ON COLUMN public.profiles.username IS
  'Usuario interno normalizado; cuenta Auth técnica en staff.huomo.invalid, sin correo real.';
COMMIT;
