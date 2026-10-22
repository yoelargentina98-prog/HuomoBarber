# Gestión de barberos y recepcionistas

Actualización de sucursales: las altas de barberos requieren `branch_id` de una
sucursal activa. El servidor lo valida antes de crear Auth y lo guarda en el perfil.
La respuesta devuelve la sucursal para mostrarla inmediatamente en el listado.
Ver [sucursales y tarifas](branches.md). Recepción puede dejarla pendiente.

## Estado remoto actualizado

La función `create-staff` fue desplegada en el proyecto HuomoBarber
(`dnzvuwzpsfqduqdmfnmi`). Se verificó OPTIONS 200, GET 405 y POST sin sesión 401.
El propietario confirmó la aplicación de la migración de usernames.
El propietario confirmó un alta real. La validación de sucursal añadida después
fue cubierta por pruebas, sin crear otras cuentas reales.
Las referencias siguientes a una entrega sin desplegar describen el estado inicial.

> Actualización de interfaz: el ingreso ahora está centralizado en `/admin` y
> Equipo hereda ese acceso. Ver [dashboard y rutas vigentes](admin-dashboard.md).
> El error del listado ya no devuelve al administrador a la pantalla de ingreso.

## Alcance y estado

Implementado localmente: acceso del administrador, alta de empleado y listado en
`/admin/personal`. Roles permitidos: `barber` y `reception`. No hay registro público.
No incluye edición, desactivación, horarios, comisiones, recuperación de contraseña
ni pantallas de acceso de empleados. Los demás portales siguen siendo prototipos.

La migración y Edge Function de esta entrega **no fueron aplicadas ni desplegadas
en el proyecto remoto**. La integración completa requiere los pasos siguientes.

## Activación en Supabase

1. Confirmar que la migración inicial de profiles está aplicada y que
   `admin@huomobarber.com.ar` tiene rol admin (ver `admin-bootstrap.md`).
2. Ejecutar en SQL Editor, una sola vez, la nueva migración
   `supabase/migrations/20261021010000_staff_usernames.sql`.
3. Instalar/iniciar sesión en Supabase CLI y vincular el proyecto correcto:
   `supabase login` y `supabase link --project-ref TU_PROJECT_REF`.
4. Desplegar: `supabase functions deploy create-staff`.
   `supabase/config.toml` desactiva la validación del gateway; el handler verifica
   obligatoriamente el token con `auth.getUser` y el rol actual en la base.
   Nunca eliminar estos controles al modificar la función.
5. Supabase aloja `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como secretos de sus
   funciones. No copiar esa clave en `.env.local`, Vite ni Vercel frontend.
6. Ejecutar `npm run dev`, abrir `/admin/personal` e ingresar con la contraseña
   de la cuenta administradora ya creada.

Si se usa CLI para migraciones en lugar de SQL Editor, reconciliar primero el
historial de la migración inicial aplicada manualmente. No ejecutar db push a
ciegas sobre un historial divergente.

## Operación

El administrador ingresa nombre completo, usuario único, rol, teléfono opcional y
contraseña inicial (12 a 128 caracteres; además rige la política de Auth).
Los usuarios se normalizan a minúsculas. No se solicitan emails de empleados.
Auth utiliza `usuario@staff.huomo.invalid`, un identificador técnico en dominio
reservado, sin mensajes de correo. Ese dominio debe conservarse al implementar
el futuro login por usuario. El administrador mantiene su email real de acceso.
No hay recuperación por correo para empleados: se deberá implementar un proceso
administrativo de restablecimiento antes de habilitar su acceso cotidiano.

La contraseña no se guarda en profiles, no se devuelve en la respuesta y no se
registra en logs. Auth la administra. Al completar el alta se limpia el formulario.
La sesión del administrador no se reemplaza al crear empleados.

## Flujo y responsabilidades

`StaffPage` controla acceso y listado. `AdminAccess` y `StaffForm` contienen los
formularios. `admin-session.ts` y `staff-service.ts` encapsulan Supabase.
`staff-input.ts` comparte validación entre navegador y servidor, sin dependencias
de runtime del servidor. Los componentes no consultan Supabase directamente.

El servidor verifica la identidad, consulta profiles y exige admin. Luego valida
el payload y crea Auth, seguido del perfil. Hay índice único de usuario y Auth
rechaza identidades repetidas, incluso ante solicitudes concurrentes.

Auth y Postgres no comparten transacción: si falla el perfil, se elimina la cuenta
recién creada. Si falla esa compensación, el servidor registra solo el UUID para
intervención manual. Revisar Authentication y profiles y eliminar únicamente la
cuenta incompleta identificada antes de reintentar. Ante respuesta perdida o error
de red, revisar el listado antes de repetir el alta.

RLS limita las lecturas; además, authenticated solo puede actualizar full_name y
phone. No puede insertar/eliminar perfiles ni modificar id, role o username.
El servidor usa service_role tras comprobar el permiso del solicitante.
El listado consulta páginas de 20 empleados en servidor, con búsqueda y rol aplicados antes de paginar. Ver [paginación](pagination.md).

## Verificación y límites

Verificaciones locales de esta entrega: 36 pruebas aprobadas; lint, compilación
TypeScript/Vite y revisión de tipos de Edge Function con Deno aprobados.
Se abrió `/admin/personal` en navegador y se confirmó que, sin sesión, muestra
el acceso del administrador y oculta el listado y el formulario de empleados.
No se ingresaron contraseñas ni se crearon empleados reales durante las pruebas.

Pruebas automatizadas cubren validación, normalización, rechazo de admin como rol
destino, sesión ausente/inválida, solicitante sin privilegios, duplicados,
compensación, respuesta y formulario. Las pruebas del servidor usan dobles de
Supabase: no sustituyen la comprobación real de Auth y RLS.

Tras activar, comprobar en un entorno de prueba:

1. Entrar como administrador y crear un barbero y una recepcionista.
2. Verificar perfil, rol e identidad Auth; confirmar que la sesión sigue siendo admin.
3. Repetir un usuario y comprobar que no se duplica ni modifica el original.
4. Invocar la función sin token y con una cuenta barbero/recepción: esperar 401/403.
5. Intentar actualizar role/username usando un token de empleado: debe rechazarse.
6. Cerrar sesión y comprobar que el listado y formulario quedan ocultos.

Referencias oficiales: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[seguridad de funciones](https://supabase.com/docs/guides/functions/auth) y
[gestión de perfiles](https://supabase.com/docs/guides/auth/managing-user-data).

## Corrección de altas después del registro público de clientes

Se aplicó al proyecto remoto la migración `20261021030300_staff_role_server_access.sql`. El trigger `prevent_role_self_elevation` desplegado conservaba una versión SECURITY DEFINER antigua que rechazaba la actualización realizada por la Edge Function con service_role: Auth ya había creado un perfil cliente y el UPSERT intentaba convertirlo en empleado.

La función ahora usa SECURITY INVOKER y search_path vacío para identificar al rol SQL real. Permite al servidor service_role crear el perfil interno y conserva el bloqueo de autoasignación de roles e identidad. No se cambiaron políticas RLS, contraseñas ni cuentas existentes. No requiere recompilar el APK ni desplegar nuevamente create-staff.

Se reprodujo primero el rechazo en PostgreSQL y luego se ejecutó `supabase/tests/staff_client_profile_promotion.sql` contra la base remota: el alta pública ignoró metadata role=admin, el UPSERT del servidor creó un barbero con ficha/sucursal, permitió recepción y rechazó la autoelevación a administrador. Todo el test finaliza con ROLLBACK. Aplicación por SQL Management API; no reejecutar db push sin reconciliar el historial.

## Reinicio de datos solicitado por el propietario — 21/10/2026

Se ejecutó `supabase/clean_database.sql` sobre HuomoBarber, conservando únicamente la cuenta y perfil `admin@huomobarber.com.ar`. Se eliminaron los demás usuarios y todos los datos operativos, incluidas sucursales, catálogo, turnos, servicios realizados, pagos, gastos, remuneraciones y horarios. La transacción verificó que todas las tablas públicas estuvieran vacías salvo el perfil administrador y las reglas predeterminadas de reservas. Resultado: Auth=1, perfiles=1, sucursales=0, turnos=0, servicios realizados=0, pagos=0. No se modificó la contraseña del administrador ni la configuración de Google. Este script es destructivo y de ejecución manual; no es una migración automática.

## Limpieza de personas y trabajos conservando configuración — 21/10/2026

Por solicitud explícita se ejecutó `supabase/reset_people_and_cash.sql`. Se eliminaron clientes, empleados, asignaciones/horarios de empleados, remuneraciones, turnos, trabajos realizados y cobros. Quedó únicamente Administración. Se preservaron exactamente las filas completas de las 2 sucursales, los 7 servicios y las 14 configuraciones de servicio por sucursal, incluidos precios, duraciones, estados y horarios de apertura. El script comparó snapshots JSON completos antes y después dentro de la transacción. No se borró el catálogo ni se ejecutó el reinicio total anterior. Resultado: usuarios=1, perfiles no administradores=0, trabajos=0, pagos=0, turnos=0. Script manual destructivo, no migración de despliegue.
