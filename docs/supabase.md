# Integración y Estrategia con Supabase — Huomo

> Actualización de personal: ver [staff-management.md](staff-management.md).
> La migración de usernames restringe las escrituras directas: el alta y los roles
> se administran mediante Edge Function. El módulo de personal ya exige sesión
> admin; las notas de Sprint 0 sobre falta de autenticación aplican al resto.

Este documento detalla la arquitectura de integración con Supabase, la política estricta de seguridad de claves, el flujo de migraciones de base de datos, el modelo de perfiles y roles, y la estrategia de Row Level Security (RLS).

---

## 1. Configuración de Variables de Entorno

El proyecto consume únicamente dos variables de entorno en el frontend:

| Variable                 | Propósito                                            | Exposición         |
| :----------------------- | :--------------------------------------------------- | :----------------- |
| `VITE_SUPABASE_URL`      | Endpoint HTTPS de la instancia del proyecto Supabase | Pública / Frontend |
| `VITE_SUPABASE_ANON_KEY` | Clave API anónima pública con permisos limitados     | Pública / Frontend |

### Cómo obtener estas credenciales:

1. Inicie sesión en [supabase.com](https://supabase.com) y seleccione su proyecto.
2. Vaya a **Project Settings** > **API**.
3. En la sección **Project URL**, copie la URL.
4. En la sección **Project API keys**, copie la clave etiquetada como `anon` `public` o `publishable`.
5. Péguelas en su archivo `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

---

## 2. Política de Manejo de Secretos

- **Prohibición de `service_role`**: La clave de servicio (`service_role`) posee permisos de superusuario capaces de anular todas las políticas RLS. **Bajo ninguna circunstancia debe incluirse en variables con prefijo `VITE_` ni desplegarse en el cliente web.**
- **Validación Automática**: El módulo [`src/shared/lib/env.ts`](../src/shared/lib/env.ts) inspecciona automáticamente las variables al iniciar la aplicación e interrumpe el flujo si detecta cadenas correspondientes a `service_role` o nombres sospechosos de claves secretas.
- **Protección Git**: El archivo [`.gitignore`](../.gitignore) bloquea preventivamente cualquier archivo `.env*` para evitar filtraciones en repositorios remotos.

---

## 3. Estado del Cliente y Resiliencia

- **Cliente centralizado**: La inicialización del cliente se encuentra en [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts).
- **Arranque sin conexión obligatoria**: Si el desarrollador clona el proyecto y aún no cuenta con un proyecto de Supabase, la aplicación inicia normalmente, permitiendo revisar portales, layouts y diseño visual.
- **Detección clara de estado**: Los componentes pueden consultar `isSupabaseConfigured()`, mostrando el estado actual en pantalla sin generar fallos catastróficos ni pantallas en blanco.

---

## 4. Flujo de Migraciones de Base de Datos

Las migraciones SQL residen en la carpeta versionada [`supabase/migrations/`](../supabase/migrations/).

### Flujo de trabajo estándar:

1. **Crear una nueva migración con Supabase CLI**:
   ```bash
   npx supabase migration new nombre_de_la_migracion
   ```
2. **Aplicar en entorno local**:
   ```bash
   npx supabase db reset
   ```
3. **Generar tipos TypeScript automáticos**:
   ```bash
   npx supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

---

## 5. Migración: Modelo de Perfiles y Roles (`public.profiles`)

Archivo: [`supabase/migrations/20261020220500_create_profiles_and_roles.sql`](../supabase/migrations/20261020220500_create_profiles_and_roles.sql)

### Estructura de la Tabla:

- `id` (UUID, Primary Key): Referencia directa a `auth.users(id)` con eliminación en cascada (`ON DELETE CASCADE`).
- `role` (`public.app_role`): Enum con valores `'admin'`, `'reception'`, `'barber'`. Por defecto es `NULL` (usuario sin privilegios asignados).
- `full_name` (TEXT): Nombre completo visible para comprobantes y agendas.
- `phone` (TEXT): Teléfono de contacto.
- `created_at` / `updated_at` (TIMESTAMPTZ): Marcas de tiempo gestionadas automáticamente.

### Reglas de Seguridad y RLS Obligatorias:

1. **RLS Activado**: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`.
2. **Prevención de Recursión Infinita**: Se implementa la función auxiliar `public.is_admin()` con `SECURITY DEFINER` para evaluar permisos de administrador sin reentradas cíclicas en las políticas.
3. **Trigger de Integridad de Roles (`prevent_role_self_elevation`)**:
   Un trigger `BEFORE UPDATE` garantiza que **ningún usuario pueda modificar o elevar su propio rol**. Únicamente llamadas ejecutadas por un usuario verificado como `admin` pueden alterar la columna `role`.
4. **Política de nuevos usuarios**: Nuevos registros solo pueden crear un perfil con `role = NULL`. Nunca se asigna rol administrador de forma automática.

### Asignación de Administrador Inicial:

La migración incluye un bloque PL/pgSQL que busca al usuario `admin@huomobarber.com.ar` en `auth.users` y vincula su ID a `public.profiles` con rol `admin`.

- **Comportamiento ante ausencia**: Si el usuario no existe en `auth.users`, la migración aborta inmediatamente arrojando:
  `ERROR DE ASIGNACIÓN: El usuario "admin@huomobarber.com.ar" no existe en auth.users.`
- **Integridad**: No crea cuentas alternativas ni altera contraseñas existentes.

---

## 6. Procedimientos Operativos

### A. Cómo Verificar la Asignación del Administrador

Una vez aplicada la migración, ejecute la siguiente consulta en el SQL Editor de Supabase:

```sql
SELECT
  p.id,
  u.email,
  p.role,
  p.full_name,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'admin@huomobarber.com.ar';
```

**Resultado esperado**:

- `role`: `admin`
- `email`: `admin@huomobarber.com.ar`

### B. Cómo Crear Futuros Administradores de Forma Segura

Dado que las políticas RLS y el trigger de seguridad impiden que los usuarios comunes eleven su propio rol, los nuevos administradores deben designarse mediante uno de los siguientes dos métodos seguros:

#### Método 1: Desde el SQL Editor de Supabase (Recomendado para superusuarios)

1. Dar de alta la cuenta de usuario en **Authentication** > **Users** (o mediante invitación por email).
2. Obtener el email del usuario y ejecutar en el SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'::public.app_role,
       updated_at = now()
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'nuevo_admin@huomobarber.com.ar'
   );
   ```

#### Método 2: Desde el Panel de Administración de Huomo (Cuando esté implementado en frontend)

- Un administrador con sesión activa podrá promover a otros usuarios a `admin`, `reception` o `barber` consumiendo el endpoint autorizado que cumplirá la condición `public.is_admin()`.

---

## 7. Aviso sobre el Estado del Frontend

> ⚠️ **IMPORTANTE**: La creación del modelo de perfiles y la asignación del rol en la base de datos **no protege automáticamente los portales en el frontend todavía**.
> Hasta que se implemente la pantalla de inicio de sesión (`/login`) y las rutas protegidas (`ProtectedRoute`) en el frontend, los portales `/admin`, `/recepcion` y `/barbero` continúan funcionando como pantallas de prueba para revisión de interfaz y layout.
