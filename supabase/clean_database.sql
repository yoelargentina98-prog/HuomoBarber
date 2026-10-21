-- ============================================================================
-- Script: supabase/clean_database.sql
-- Propósito:
--   Limpiar toda la base de datos de Huomo EXCEPTO:
--     1. El usuario Administrador (admin@huomobarber.com.ar en auth.users y public.profiles).
--     2. Las sucursales existentes en public.branches (se preservan intactas).
--
-- Borra:
--   - Todos los barberos y recepcionistas (auth.users, profiles, employee_details).
--   - Todos los servicios y catálogo (service_catalog, branch_services, barber_services).
--   - Todas las ventas, pagos y cobros de caja (cash_payments).
--   - Todos los gastos de sucursales (branch_expenses, branch_expense_audit).
--   - Todos los horarios de barberos (barber_schedules).
--   - Todo el historial laboral (employee_services, compensation, adjustments, audit).
-- ============================================================================

BEGIN;

-- 1. Verificación preventiva de seguridad: El usuario administrador DEBE existir
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@huomobarber.com.ar';
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'OPERACIÓN ABORTADA: No se encontró al usuario admin@huomobarber.com.ar. No se realizó ningún cambio.';
  END IF;
  RAISE NOTICE 'Administrador verificado correctamente (ID: %). Iniciando limpieza...', v_admin_id;
END $$;

-- 2. Limpieza de tablas financieras y transaccionales
TRUNCATE TABLE public.cash_payments CASCADE;
TRUNCATE TABLE public.branch_expense_audit CASCADE;
TRUNCATE TABLE public.branch_expenses CASCADE;

-- 3. Limpieza de catálogo de servicios y asignaciones
TRUNCATE TABLE public.barber_services CASCADE;
TRUNCATE TABLE public.branch_services CASCADE;
TRUNCATE TABLE public.service_catalog CASCADE;

-- 4. Limpieza de registros laborales y horarios
TRUNCATE TABLE public.barber_schedules CASCADE;
TRUNCATE TABLE public.employee_adjustments CASCADE;
TRUNCATE TABLE public.employee_services CASCADE;
TRUNCATE TABLE public.employee_compensation CASCADE;
TRUNCATE TABLE public.employee_audit CASCADE;
TRUNCATE TABLE public.employee_details CASCADE;

-- 5. Eliminar perfiles que no sean del administrador
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE email = 'admin@huomobarber.com.ar'
);

-- 6. Eliminar usuarios de Auth que no sean el administrador
DELETE FROM auth.users
WHERE email != 'admin@huomobarber.com.ar';

-- 7. Asegurar que el perfil del administrador conserve el rol 'admin'
UPDATE public.profiles
SET role = 'admin'::public.app_role,
    updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@huomobarber.com.ar'
);

COMMIT;

-- ============================================================================
-- Consultas de verificación posterior (deben ejecutarse para comprobar el estado)
-- ============================================================================

-- A. Verificar que el administrador sigue existiendo
SELECT 
  p.id,
  u.email,
  p.role,
  p.full_name
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

-- B. Verificar que las sucursales siguen intactas
SELECT id, name, active, created_at FROM public.branches;

-- C. Verificar que todo lo demás está en 0
SELECT 
  (SELECT count(*) FROM public.service_catalog) AS total_servicios,
  (SELECT count(*) FROM public.employee_details) AS total_empleados_ficha,
  (SELECT count(*) FROM public.cash_payments) AS total_pagos_caja,
  (SELECT count(*) FROM public.branch_expenses) AS total_gastos,
  (SELECT count(*) FROM public.barber_schedules) AS total_horarios,
  (SELECT count(*) FROM public.profiles WHERE role != 'admin') AS otros_perfiles,
  (SELECT count(*) FROM auth.users WHERE email != 'admin@huomobarber.com.ar') AS otros_usuarios_auth;
