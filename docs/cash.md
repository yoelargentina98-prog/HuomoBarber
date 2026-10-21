# Caja: cobros en efectivo y transferencia

**Actualización:** [Nueva venta y acceso de recepción](cash-sales.md) permite
registrar servicio y cobro en una operación, desde un modal. Recepción puede
operar solo su sucursal. Las limitaciones de acceso originales más abajo quedan
reemplazadas por esa guía; la anulación continúa siendo exclusiva de administración.

## Uso

Administración → **Caja** (`/admin/caja`). Elegir fecha y sucursal.

- El resumen muestra total cobrado, efectivo y transferencias, junto con cantidades.
- **Cobros registrados** lista servicio, barbero, sucursal, medio, importe, fecha,
  referencia y estado. El filtro de medio afecta solo el listado; los totales
  siempre muestran ambos medios de la fecha y sucursal elegidas.
- **Servicios pendientes de cobro** lista trabajos realizados en la fecha seleccionada
  sin un cobro vigente. Para consultar pendientes anteriores, elegir el día del trabajo.
- Pulsar **Cobrar**, seleccionar efectivo o transferencia y registrar la fecha real
  del pago. La fecha de Caja es la del cobro, que puede diferir de la del servicio.
  Se cobra el importe completo del servicio guardado; no se recalcula con tarifas actuales.
- La referencia de transferencia y las notas son opcionales. Son texto, no adjuntos.
- **Anular cobro** exige motivo. Conserva el registro y lo excluye de totales;
  el servicio vuelve a quedar pendiente. No ejecuta una devolución de dinero.
- Para corregir medio o fecha, anular el registro incorrecto y volver a cobrar.

No se cargan pagos de ejemplo ni se marca como cobrado el historial anterior.
Antes de cobrar trabajos antiguos, revisar si ya se pagaron fuera del sistema.
Los servicios sin importe no necesitan cobro y no aparecen pendientes.
Los históricos sin sucursal se muestran para revisión pero no se pueden cobrar:
no se les inventa una ubicación. Cambiar de sucursal al barbero no altera el cobro.

## Reglas y límites de esta versión

- Solo administración; recepción todavía no tiene acceso funcional.
- Un cobro completo vigente por servicio, con un único medio: efectivo o transferencia.
  No hay pagos parciales, divididos, propinas, productos ni cobros sin servicio.
- Los totales son ingresos brutos registrados, no saldo físico disponible.
  No incluyen fondo inicial, gastos, retiros, devoluciones, cierre o arqueo.
- Las transferencias son manuales, sin verificación bancaria o Mercado Pago.
  Registrar una referencia no acredita que se haya recibido dinero.
- No se modifica la comisión al cobrar: esta ya quedó fijada al realizar el servicio.
- Para anular un servicio con cobro vigente, primero anular el cobro en Caja.
- Fecha de pago no futura y posterior o igual a la fecha de realización del servicio.
- Horario `America/Argentina/Buenos_Aires`, inicio del día inclusivo, siguiente día exclusivo.
- Cobros y pendientes usan paginación de servidor, 20 filas por defecto y tamaño configurable de 1 a 200. Los filtros se aplican antes de paginar. Los totales completos se consultan aparte y se actualizan al guardar o pulsar Actualizar Caja. Ver [paginación](pagination.md).

## Modelo y seguridad

Migración `20261021021000_cash_payments.sql`, aplicada a HuomoBarber.
`cash_payments` conserva ID del servicio, empleado, sucursal y snapshots de nombres,
importe en centavos, medio (`cash`/`transfer`), fecha, referencia, notas,
administrador creador y datos de anulación. No se borran cobros desde la aplicación.

RLS de lectura solo para administradores. Las escrituras van por RPC:
`collect_service_payment`, `void_cash_payment`. Cada una valida al administrador
en servidor. `get_pending_cash_services` también exige administración.
Cada operación queda auditada en la ficha del barbero.

La fila de servicio se bloquea durante el cobro y la anulación. Un índice único
parcial impide dos cobros vigentes por servicio, incluso con sesiones concurrentes.
Cada intento incluye UUID de operación único: un reintento con el mismo contenido
devuelve el recibo existente. Si se corrigen datos se genera otro UUID, pero el
índice por servicio sigue impidiendo duplicados. Tras una respuesta de red incierta,
actualizar Caja antes de asumir que el cobro no se guardó.

Componentes pequeños en `src/features/cash`, carga de cobros/pendientes en paralelo,
cancelación lógica de respuestas viejas al cambiar filtros, sin dependencias nuevas.

## Verificación

- Suite de UI/modelo: importes por medio, anulados, límites de fecha, formulario,
  reintento idempotente, filtro, anulación y error de carga sin cifras falsas.
- Ruta `/admin/caja` protegida por el acceso administrativo existente.
- `supabase/tests/cash_payments.sql`: integración real con cobro en ambos medios,
  idempotencia, duplicados, pendientes, fecha futura, medio inválido, auditoría,
  bloqueo de anulación de servicio pagado y permisos. Todos los cambios usan
  `ROLLBACK`; no dejan cobros, servicios ni actividad de prueba.

No ejecutar `db push` sin reconciliar el historial de migraciones aplicado por SQL.
