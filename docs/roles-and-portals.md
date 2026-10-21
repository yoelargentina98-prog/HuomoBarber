# Portales, Roles y Permisos — Huomo

Este documento especifica la definición conceptual de los portales del sistema, la distinción entre roles internos y acceso público, el modelo de datos de perfiles y roles en Supabase, y las directivas de seguridad vigentes.

---

## 1. Portales del Sistema

El sistema distingue claramente entre **portales internos de empleados** y el **portal público de reservas para clientes**:

### A. Portal de Administración (`/admin`)

- **Naturaleza**: Portal interno con privilegios elevados.
- **Audiencia**: Dueños, socios y gerentes de la barbería.
- **Responsabilidad futura**:
  - Gestión integral de personal (altas, bajas, asignación de roles `reception` y `barber`).
  - Configuración del catálogo oficial de servicios, precios y duraciones.
  - Auditoría de operaciones y reportes consolidados de facturación.
- **Estado**: Estructura de layout, aviso explícito de falta de autenticación y navegación inicial implementada.

### B. Portal de Recepción (`/recepcion`)

- **Naturaleza**: Portal interno operativo.
- **Audiencia**: Recepcionistas y personal de mostrador.
- **Responsabilidad futura**:
  - Check-in de clientes con turno previo.
  - Asignación rápida de clientes sin turno a sillones disponibles.
  - Cobro de servicios, propinas y emisión de comprobantes de caja.
- **Estado**: Estructura de layout y navegación inicial implementada.

### C. Portal de Barbero (`/barbero`)

- **Naturaleza**: Portal interno de estación de trabajo.
- **Audiencia**: Barberos profesionales.
- **Responsabilidad futura**:
  - Consulta de turnos asignados del día desde dispositivos móviles/tablets.
  - Transición de estados de servicio: _Esperando_, _En servicio_, _Finalizado_.
  - Ficha técnica del corte (número de alza, preferencias de degradé, productos aplicados).
- **Estado**: Estructura de layout y navegación inicial implementada.

### D. Portal Público de Reservas (`/reservar`)

- **Naturaleza**: Portal público y abierto.
- **Audiencia**: Clientes finales de la barbería.
- **Responsabilidad futura**:
  - Navegación visual del catálogo de servicios.
  - Selección de barbero de preferencia o primer horario disponible.
  - Confirmación de turno mediante ingreso de datos de contacto mínimos.
- **Importante**: Este portal **NO constituye un rol de empleado interno**. No requiere inicio de sesión administrativo.

---

## 2. Modelo de Roles en Base de Datos (Supabase)

Definido mediante la migración [`supabase/migrations/20261020220500_create_profiles_and_roles.sql`](../supabase/migrations/20261020220500_create_profiles_and_roles.sql):

```text
public.app_role ENUM ('admin', 'reception', 'barber')

public.profiles
├── id (UUID, PK) -> auth.users.id
├── role (public.app_role, NULL por defecto)
├── full_name (TEXT)
├── phone (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Reglas de Control de Acceso (RLS) y Seguridad en Base de Datos:

1. **Inmutabilidad de Rol para Usuarios Comunes**:
   - Ningún usuario común puede auto-asignarse ni modificar su propio rol.
   - Un trigger `BEFORE UPDATE` (`prevent_role_self_elevation`) aborta cualquier transacción que intente cambiar el campo `role` si el usuario no cuenta con privilegios verificados de `admin`.
2. **Registro de Nuevos Usuarios**:
   - Nuevas cuentas inician con `role = NULL`. Nunca se concede rol `admin` de forma automática.
3. **Usuario Administrador Semilla**:
   - El usuario `admin@huomobarber.com.ar` tiene asignado el rol `admin` vinculado por su ID de `auth.users`.

---

## 3. Estado de Protección de Portales en el Frontend

> ⚠️ **AVISO CRÍTICO**:
> Hasta implementar la capa de acceso y sus controles en el frontend (formulario de login y `ProtectedRoute`), **los portales internos siguen abiertos como pantallas de prueba**.
>
> Crear el usuario y su perfil en la base de datos con rol `admin` **todavía no protege los portales visuales en el navegador**. La protección efectiva del cliente se incorporará con el flujo de autenticación, evitando crear una falsa sensación de seguridad mediante verificaciones efímeras en `localStorage`.

---

## 4. Centralización en Código Frontend

Para evitar el uso de cadenas mágicas repetidas en el proyecto, los roles y rutas se definen de manera unificada en:

- Tipos y constantes de roles: [`src/shared/types/roles.ts`](../src/shared/types/roles.ts)
- Rutas y elementos de navegación: [`src/app/router/routes.ts`](../src/app/router/routes.ts)
- Tipos generados de base de datos: [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts)
