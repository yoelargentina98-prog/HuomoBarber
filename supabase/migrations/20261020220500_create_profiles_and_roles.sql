-- ============================================================================
-- Migración: 20261020220500_create_profiles_and_roles.sql
-- Proyecto: Huomo — Sistema de Gestión de Barbería
-- Propósito:
--   1. Crear enum public.app_role ('admin', 'reception', 'barber').
--   2. Crear tabla public.profiles vinculada a auth.users(id).
--   3. Activar RLS con políticas estrictas que impiden auto-asignación de roles.
--   4. Trigger de integridad para bloquear modificación de 'role' por usuarios no admin.
--   5. Asignar rol 'admin' al usuario existente 'admin@huomobarber.com.ar'.
-- ============================================================================

BEGIN;

-- 1. Definición del enum de roles de Huomo
DO $$
BEGIN
  IF to_regtype('public.app_role') IS NULL THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'reception', 'barber');
  END IF;
END $$;

-- 2. Creación de la tabla public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role DEFAULT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfiles y roles de usuario de Huomo vinculados a auth.users';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario. NULL indica usuario pendiente de asignación.';

-- 3. Función auxiliar de seguridad (SECURITY DEFINER) para verificar si el usuario actual es admin
-- Evita bucles de recursión infinita en las políticas RLS sobre la tabla profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Verifica si el usuario autenticado es administrador sin causar recursión RLS';

-- 4. Función y Trigger para mantener updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Trigger de seguridad estricta: Prevenir que cualquier usuario modifique su propio rol
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'No se puede cambiar la identidad de un perfil.';
  END IF;
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    -- SQL Editor/migraciones pueden administrar roles sin sesión de empleado.
    -- SECURITY INVOKER conserva el rol SQL real; nunca se confía en datos del cliente.
    IF current_user NOT IN ('postgres', 'service_role') AND
       (auth.uid() = OLD.id OR NOT public.is_admin()) THEN
      RAISE EXCEPTION 'Operación rechazada: Ningún usuario puede modificar o autoasignarse roles. Requiere privilegios de administrador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_role_self_elevation ON public.profiles;
CREATE TRIGGER tr_prevent_role_self_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_elevation();

-- 6. Activación de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 7. Políticas de Seguridad RLS
-- A) Lectura: El propio usuario puede leer su perfil, y los administradores pueden leer todos
DROP POLICY IF EXISTS "Lectura de perfiles propios y administradores" ON public.profiles;
CREATE POLICY "Lectura de perfiles propios y administradores"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- B) Inserción: Un usuario puede crear su propio perfil únicamente con rol NULL; administradores pueden asignar roles
DROP POLICY IF EXISTS "Insercion de perfiles con rol restringido" ON public.profiles;
CREATE POLICY "Insercion de perfiles con rol restringido"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = id AND role IS NULL) OR public.is_admin()
  );

-- C) Actualización: El propio usuario puede actualizar sus datos personales (el trigger bloquea cambios en 'role')
--    Los administradores pueden actualizar cualquier perfil y modificar roles
DROP POLICY IF EXISTS "Actualizacion de perfil propio o por administrador" ON public.profiles;
CREATE POLICY "Actualizacion de perfil propio o por administrador"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

-- D) Eliminación: Solo administradores pueden eliminar perfiles
DROP POLICY IF EXISTS "Eliminacion de perfiles exclusiva de administradores" ON public.profiles;
CREATE POLICY "Eliminacion de perfiles exclusiva de administradores"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- 8. Asignación del rol admin al usuario existente admin@huomobarber.com.ar
-- Busca por email en auth.users, vincula por ID y falla explícitamente si no existe.
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'admin@huomobarber.com.ar'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR DE ASIGNACIÓN: El usuario "admin@huomobarber.com.ar" no existe en auth.users. Cree la cuenta previamente en Supabase Auth antes de aplicar esta migración.';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, updated_at)
  VALUES (target_user_id, 'admin'::public.app_role, 'Administrador Huomo', now())
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin'::public.app_role,
      updated_at = now();

  RAISE NOTICE 'Éxito: Rol admin asignado al usuario admin@huomobarber.com.ar (ID: %)', target_user_id;
END $$;

COMMIT;
