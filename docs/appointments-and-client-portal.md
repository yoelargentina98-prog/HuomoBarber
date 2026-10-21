# Acceso unificado, reservas y agenda

Estado verificado: 21 de octubre de 2026. Implementación local corregida y migraciones aplicadas al proyecto Supabase HuomoBarber (`dnzvuwzpsfqduqdmfnmi`). No se realizó despliegue del frontend ni push.

## Acceso y permisos

El login identifica el rol desde `profiles` y dirige a `/admin`, `/recepcion`, `/barbero` o `/cliente`. Si no puede consultar el perfil, informa el error: no supone que la persona es cliente. El registro público crea solamente clientes aunque el metadata solicite otro rol. Los usuarios internos se crean desde administración. Un usuario no administrador no puede reasignarse sucursal ni elevar su rol.

Recepción opera solamente dentro de su sucursal activa. El barbero consulta solamente sus turnos. El cliente consulta y modifica solamente sus reservas. Estas restricciones existen en PostgreSQL y RLS, además de las pantallas.

## Disponibilidad

Para habilitar reservas, configurar **Sucursales → ingresar a la sucursal → horarios de apertura**, además del horario del barbero, servicios habilitados y precios de esa sucursal mayores a cero. No se inventaron horarios para Irigoyen ni Mosconi.

La disponibilidad cruza horarios y excepciones de sucursal y barbero, duración del servicio, turnos existentes y bloqueos. Los bloqueos pueden abarcar toda la sucursal o un barbero y se administran desde la ficha de sucursal. Un bloqueo que cruza un turno confirmado exige reprogramar o cancelar ese turno primero. Los horarios usan Argentina.

También el personal debe respetar la disponibilidad. Las reservas manuales guardan `created_by` como operador y `client_id = NULL`: el operador no queda registrado como consumidor. Una reprogramación conserva precio y duración históricos y se revierte completa si el destino deja de estar libre.

## Atención y caja

Una reserva no genera ingreso ni comisión hasta registrar la atención. El diálogo compartido de administración y recepción exige elegir efectivo o transferencia; admite referencia y notas. Guarda el servicio con su categoría real, comisión y cobro en una transacción. Impide completar turnos futuros.

La operación usa un identificador de idempotencia. Reintentar el mismo cobro devuelve el resultado original; cambiar el contenido de un reintento se rechaza. No duplica servicio, comisión ni recibo. Un registro anulado tampoco se reutiliza como cobro válido.

La agenda permite registrar llegada del cliente el mismo día y ausencia después del fin del turno, siempre con autorización de sucursal. Las agendas del administrador, recepción y barbero tienen páginas de 20 filas; cambiar filtros reinicia la página. La agenda del barbero se ordena cronológicamente.

## Recuperación y confirmación de cuenta

`/recuperar` verifica sesión, solicita nueva contraseña y confirmación, actualiza mediante Supabase Auth y cierra la sesión para un ingreso explícito. Maneja enlaces vencidos y errores. El registro envía confirmación a `/cliente`.

En Supabase se agregaron exactamente estas URLs a la lista de redirecciones permitidas, conservando el resto de la configuración y la confirmación de email:

- `http://localhost:5173/recuperar`
- `http://127.0.0.1:5173/recuperar`
- `http://localhost:5173/cliente`
- `http://127.0.0.1:5173/cliente`

Antes de publicar, agregar las mismas rutas del dominio real de producción y configurar el sitio y envío de correo de producción. No se enviaron correos ni se cambiaron contraseñas reales durante estas pruebas.

Referencias: [recuperación de Supabase](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [redirecciones de Auth](https://supabase.com/docs/guides/auth/redirect-urls).

## Migraciones aplicadas

En este orden:

1. `20261021030000_appointments_and_clients.sql`: clientes, turnos, reglas, permisos, reservas y cobro.
2. `20261021030100_booking_availability.sql`: horarios de sucursal, bloqueos, disponibilidad, reprogramación y permisos de sucursal.
3. `20261021030200_booking_service_integrity.sql`: asistencia, cobro idempotente y directorio público habilitado.

Se ejecutaron contra el proyecto remoto con el CLI autenticado mediante SQL Management API. Este mecanismo no actualiza automáticamente el historial de `supabase migration`; no ejecutar `db push` a ciegas ni repetir la migración inicial. Antes de adoptar ese flujo, reconciliar el historial con el esquema existente.

`src/integrations/supabase/database.generated.ts` se regeneró desde el esquema remoto. `types.ts` reexporta esos tipos; no mantener firmas RPC manuales que no coincidan con la base.

## Verificación reproducible

- `npm run build`: TypeScript y compilación de producción.
- `npm run lint`.
- `npm run test -- --maxWorkers=2`: pruebas frontend y contratos con mocks. Estos mocks no prueban concurrencia de PostgreSQL.
- `supabase/tests/appointments_integration.sql`: ejecutado contra PostgreSQL real dentro de una transacción con `ROLLBACK`. Prueba horarios, bloqueos, precio/duración históricos, idempotencia de cobro, categoría y comisión, separación de cliente y operador, y permisos entre roles/sucursales.
- `python -X utf8 supabase/tests/run_appointments_concurrency.py`: ejecutado contra el proyecto remoto con dos transacciones independientes. Comprueba un único ganador para el mismo horario y preserva el límite de reservas del cliente aun con barberos distintos. Crea fixtures aislados y los elimina en `finally`; confirmó su eliminación.

Las pruebas de base pasaron. No se modificaron ventas, reservas ni horarios de negocio reales. La suite frontend previa pasó 128 pruebas y las pruebas actualizadas de reservas y recuperación pasaron 12 pruebas (incluye 4 nuevas de recuperación).
