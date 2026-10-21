# Supabase - Migraciones y Configuración de Base de Datos

Este directorio alberga la estructura de base de datos, migraciones SQL y configuraciones del backend en Supabase para Huomo.

Estado y pasos del alta inicial: [Administrador inicial](../docs/admin-bootstrap.md).
Consulta posterior de solo lectura: [verify-admin.sql](verify-admin.sql).

## Gestión de personal

La migración `20261021010000_staff_usernames.sql` agrega usuarios únicos y limita
las escrituras directas de perfiles. La función `create-staff` crea las cuentas
desde servidor. Ver [pasos de activación y verificación](../docs/staff-management.md).
Estos nuevos artefactos están preparados localmente; no desplegados.

## Estructura

- `migrations/`: Archivos SQL versionados con el formato `YYYYMMDDHHMMSS_descripcion.sql`.

### Historial de Migraciones:

1. **`20261020220500_create_profiles_and_roles.sql`**:
   - Creación del tipo enum `public.app_role` (`admin`, `reception`, `barber`).
   - Creación de la tabla `public.profiles` referenciada a `auth.users(id)` con `ON DELETE CASCADE`.
   - Función auxiliar `public.is_admin()` (`SECURITY DEFINER`) para evitar recursión en RLS.
   - Trigger `prevent_role_self_elevation` que impide la modificación del rol por usuarios no administradores.
   - Activación de Row Level Security (RLS) con políticas para SELECT, INSERT, UPDATE y DELETE.
   - Asignación obligatoria del rol `admin` al usuario existente `admin@huomobarber.com.ar` (falla con excepción si no existe en `auth.users`).

---

## Flujo de Aplicación de Migraciones

### Opción A: Mediante SQL Editor de Supabase (Recomendado para esta entrega)

1. Abrir el proyecto en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor**.
3. Copiar el contenido de `supabase/migrations/20261020220500_create_profiles_and_roles.sql`.
4. Ejecutar el script.

### Opción B: Mediante Supabase CLI

```bash
# Vincular proyecto remoto (requiere Project ID y Database Password)
npx supabase link --project-ref dnzvuwzpsfqduqdmfnmi

# Desplegar migraciones pendientes
npx supabase db push
```

---

## Reglas de Seguridad (RLS)

- Toda tabla **DEBE** tener Row Level Security (RLS) habilitado de forma obligatoria (`ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;`).
- Ninguna política permisiva abierta (`USING (true)`) para operaciones de escritura/modificación.
- El frontend únicamente utiliza la clave pública anónima o publishable (`VITE_SUPABASE_ANON_KEY`).
- La clave `service_role` jamás debe existir en el código cliente.
