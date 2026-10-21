# Huomo — Gestión de barbería

Aplicación con React, Vite y TypeScript; Supabase para datos y cuentas; preparada para Vercel.

## Estado actual

- Dashboard administrativo con acceso privado, menú lateral y resumen del equipo.
- Listado de barberos/recepcionistas con búsqueda y filtro por rol.
- Mini dashboard en Equipo: destacados y totales semanales, con filtro por sucursal.
- Catálogo central de servicios y asignación por checkboxes a cada barbero.
- Pestaña Horarios por barbero: semana habitual, turnos partidos y excepciones por fecha.
- Gestión de sucursales (Irigoyen y Mosconi creadas), precios por sucursal y
  pertenencia de cada barbero a una sola ubicación.
- Ficha individual: servicios, desempeño mensual, comisiones, fijo, extras,
  bonos, descuentos, datos personales y estado de acceso.
- Formulario de alta conectado a la Edge Function `create-staff`.
- El backend de altas y fichas ya está aplicado en el proyecto HuomoBarber.
- Caja habilitada: cobros de servicios en efectivo y transferencia, por día y sucursal.
- Nueva venta desde un modal: servicio, barbero y pago en una operación; recepción limitada a su sucursal.
- Agenda y reservas siguen en preparación.
- La landing no está construida. No hay enlaces públicos hacia los portales internos.

## Rutas

`/admin/servicios` gestiona el catálogo; `/admin/personal/:employeeId` abre la ficha
con checkboxes de servicios habilitados para el barbero.

| Ruta              | Comportamiento                                               |
| ----------------- | ------------------------------------------------------------ |
| `/`               | Espacio reservado para la futura landing.                    |
| `/admin`          | Ingreso privado; dashboard cuando la sesión tiene rol admin. |
| `/admin/personal` | Gestión del equipo dentro del espacio administrativo.        |
| `/reservar`       | Prototipo de reservas públicas.                              |
| `/recepcion`      | Acceso con usuario a Caja de la sucursal asignada.           |
| `/barbero`        | Dashboard personal del barbero, protegido por sesión.        |

Para entrar a administración, escribir `/admin` directamente en el navegador.
No existe registro público de empleados.

## Desarrollo local

1. Instalar dependencias con `npm install` usando una versión de Node compatible con Vite.
2. Copiar `.env.example` a `.env.local` y completar la URL y clave **pública** de Supabase.
3. Ejecutar `npm run dev` y abrir la URL informada por Vite.
4. Para el administrador y altas reales, seguir [alta inicial](docs/admin-bootstrap.md) y [activación del backend](docs/staff-management.md).

La raíz se puede visitar sin credenciales. La administración necesita Supabase configurado,
una cuenta existente y un perfil con rol admin. Nunca colocar claves secretas en variables VITE_.

## Controles

| Comando              | Uso                                              |
| -------------------- | ------------------------------------------------ |
| `npm run build`      | Revisión de tipos y compilación de producción.   |
| `npm run typecheck`  | Verificar los proyectos TypeScript con `tsc -b`. |
| `npm run lint`       | Análisis estático.                               |
| `npm run format`     | Comprobar formato.                               |
| `npm run format:fix` | Aplicar formato.                                 |
| `npm run test`       | Pruebas automatizadas.                           |
| `npm run test:watch` | Pruebas en modo interactivo.                     |
| `npm run preview`    | Servir la compilación local.                     |

## Documentación

- [Paginación de todos los listados y tamaños de Caja](docs/pagination.md).

- [Balances y gastos por sucursal](docs/branch-finances.md).

- [Portal de recepción y equipo por sucursal](docs/reception-workspace.md).

- [Dashboard personal del barbero](docs/barber-dashboard.md).
- [Ingreso por rol](docs/barber-access.md).

- [Ventas desde Caja y acceso de recepción](docs/cash-sales.md).

- [Caja y medios de pago](docs/cash.md).

- [Mini dashboard de Equipo](docs/team-dashboard.md).

- [Horarios de actividad de barberos](docs/barber-schedules.md).

- [Sucursales, precios y empleados](docs/branches.md).
- [Catálogo y servicios habilitados por barbero](docs/service-catalog.md).
- [Ficha del empleado y reglas de remuneración](docs/employee-records.md).
- [Dashboard, rutas y estados de error](docs/admin-dashboard.md).
- [Personal: operación, backend y límites](docs/staff-management.md).
- [Arquitectura](docs/architecture.md) y [convenciones](docs/development.md).
- [Supabase](docs/supabase.md) y [despliegue](docs/deployment.md).
- [Decisiones técnicas](docs/decisions.md).
- [Sprint 0, registro histórico](docs/sprint-0.md).

El código local no implica que migraciones o funciones estén desplegadas en el proyecto remoto.
