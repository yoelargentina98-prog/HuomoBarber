# Horarios de actividad de barberos

## Uso desde administración

Equipo → ficha del barbero → **Horarios**. Solo aparece en barberos.
La configuración no depende del mes seleccionado en la ficha.

- Cada día de la semana admite hasta ocho franjas. Ejemplo: 09:00–13:00 y
  16:00–20:00. El intervalo entre ambas es un descanso.
- Un día sin franjas es un día libre. No se cargan horarios de ejemplo automáticamente.
- Una excepción por fecha reemplaza el día completo de la semana habitual.
  Sin franjas indica ausencia, vacaciones o feriado; con franjas indica un horario especial.
- Para una ausencia de varios días se agrega una excepción por cada fecha.
- Quitar una excepción restaura la semana habitual de esa fecha.
- Los cambios se envían juntos al pulsar **Guardar horarios**. Salir sin guardar descarta la edición.
- Las horas son locales de Argentina (`America/Argentina/Buenos_Aires`).
  No se permiten franjas que crucen medianoche; deben dividirse entre ambos días.

## Persistencia y permisos

Migración `20261021020800_barber_schedules.sql`, aplicada a HuomoBarber.
`barber_schedules` contiene una fila por empleado con semana, excepciones,
revisión y fecha de actualización. Las estructuras JSON contienen días 0–6
(domingo–sábado) y franjas `{ start: "HH:mm", end: "HH:mm" }`.
Las excepciones agregan `date: "YYYY-MM-DD"` y `reason` (hasta 300 caracteres).
Límite: 366 excepciones por barbero; no se elimina historia automáticamente.

Solo administración puede leer mediante RLS. Las escrituras se hacen exclusivamente
por `save_barber_schedule`, con autorización en servidor, validación de rol,
fechas únicas, siete días semanales únicos, franjas válidas y sin superposición.
Se permiten franjas contiguas. Guardar serializa cambios por ficha y compara
`expected_revision`; rechaza una edición basada en datos viejos. Ante ese error,
volver a abrir la pestaña para cargar la configuración actual y rehacer la edición.
Si hubo un fallo de red después de guardar, recargar antes de reintentar.

Cada guardado queda en `employee_audit`, con administrador, valores anteriores
y nuevos. La pestaña Actividad muestra los horarios en texto legible.
Los cambios de sucursal conservan el horario personal; revisar al trasladar al empleado.

## Alcance y siguientes integraciones

Este módulo configura disponibilidad; todavía no genera turnos ni controla reservas.
No modifica servicios ya registrados ni calcula horas trabajadas, asistencia o salario.
Los horarios de apertura de sucursal aún no están implementados; por eso todavía
no se exige que el horario personal esté contenido dentro de la apertura.
La futura agenda deberá cruzar apertura de sucursal, empleado activo, semana/excepciones,
servicio habilitado, duración y turnos ocupados. `intervalsForDate` resuelve la
precedencia excepción → semana, pero no representa por sí solo disponibilidad reservable.

## Verificación

- Pruebas de UI: carga, fallo sin editor, edición y guardados consecutivos con revisión.
- Modelo: superposiciones, cruce de medianoche, reemplazo completo por excepción.
- `supabase/tests/barber_schedules.sql`: guardado real, revisión obsoleta, auditoría,
  fechas repetidas, franjas superpuestas, rol incorrecto y RLS de empleado.
  Ejecutado en transacción con `ROLLBACK`; no deja horarios de prueba.
- Compilación, TypeScript, lint y suite automatizada.

No ejecutar `db push` hasta reconciliar el historial de migraciones aplicado por SQL.
