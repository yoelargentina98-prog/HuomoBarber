# Nueva venta desde Caja y acceso de recepción

## Circuito

**Caja → Nueva venta** abre un diálogo modal con el fondo desenfocado. El navegador
bloquea la interacción con el fondo, mantiene el foco dentro del diálogo y permite
cerrar con Escape o Cerrar formulario. El contenido se desplaza dentro del modal
si no entra en la pantalla. El desplazamiento del fondo se restaura al cerrar.

1. Administración selecciona una sucursal dentro del modal (se propone el filtro actual).
2. Seleccionar barbero y uno de sus servicios habilitados.
3. Elegir efectivo o transferencia. Referencia y notas son opcionales.
4. **Registrar venta y cobro** crea el trabajo, su comisión y el cobro juntos.

Solo aparecen barberos activos de la sucursal con servicios activos, asignados
y con precio mayor a cero. Se cobra el precio de esa sucursal, sin edición manual.
Si cambió el precio desde la carga, se rechaza la operación para evitar cobrar
un importe distinto del mostrado. Se requiere remuneración vigente del barbero.
Fecha y hora son las actuales del servidor para servicio y pago; para trabajos
históricos sigue existiendo el circuito de registro y cobro separado.
Cada venta actual contiene un servicio y un medio de pago; no hay carrito,
pagos divididos, productos ni emisión de comprobantes fiscales.

## Recepción

El ingreso de `/admin` también acepta **Usuario o email**. Si la cuenta es
recepcionista, redirige a `/recepcion` tras validar su sucursal y estado; nunca
le concede acceso al dashboard administrativo. Administración conserva ingreso por email.

Ingresar directamente a `/recepcion` con el **usuario y contraseña** creados
desde Equipo. No se requiere un correo personal. Se utiliza internamente el
identificador de Auth existente `usuario@staff.huomo.invalid`.

La cuenta debe estar activa y pertenecer a una sucursal activa. Si no tiene
sucursal, administración debe asignarla en Equipo → ficha → Datos y acceso.
La aplicación rechaza el acceso hasta resolverlo; no selecciona una sucursal por defecto.

Recepción ve solo Caja de su sucursal, sin selector de sucursal, fichas de empleados
ni herramientas de administración. Dentro del modal se muestra la sucursal fija.
Puede crear ventas y cobrar pendientes de su sucursal. Las anulaciones siguen
reservadas a administración. Un administrador en `/recepcion` conserva sus permisos
de selección; la experiencia administrativa principal sigue en `/admin/caja`.

## Seguridad y atomicidad

Migraciones aplicadas:

- `20261021021100_cash_sales_access.sql`: permisos por sucursal, sesión de operador,
  opciones de venta y RPC atómica `register_cash_sale`.
- `20261021021200_reception_cash_scope.sql`: cobros y pendientes limitados a la sucursal.
- `20261021021300_pending_branch_alias.sql`: calificación de columna en consulta de pendientes.

`can_access_cash_branch` valida administrador o recepción activa en sucursal activa.
La RLS de `cash_payments` filtra también lecturas directas por API. Las RPC no confían
en la sucursal enviada por el navegador: comprueban el acceso y la pertenencia del
barbero, la asignación del servicio, su precio y las condiciones de remuneración.
Recepción nunca recibe las condiciones salariales de otros empleados.

`register_cash_sale` inserta servicio y pago dentro de una transacción; si falla,
no queda ningún registro parcial. Los snapshots conservan precio, comisión,
servicio, barbero y sucursal. Ambos registros quedan auditados con el usuario actor.

El UUID de operación se conserva al reintentar una venta; se serializa por UUID
y se compara el contenido original. El formulario bloquea sus campos después del
primer intento para poder repetir exactamente la misma operación tras un fallo de red.
Ante un error de validación, cerrar y volver a abrir para corregir datos. Ante
una respuesta incierta, actualizar Caja y revisar antes de iniciar otra venta.
La misma operación no crea dos servicios ni dos cobros. Esto no pretende detectar
dos ventas legítimas distintas con el mismo barbero, servicio e importe.

## Verificación

### Diagnóstico de opciones vacías

La RPC `get_cash_sale_setup` (migración `20261021021600_cash_sale_setup.sql`)
explica si falta sucursal activa, barberos activos, servicios con precio o
asignaciones por barbero. Mantiene la autorización por sucursal, sin remuneraciones.
Si Nueva venta no tiene combinaciones válidas, muestra ese diagnóstico;
administración tiene enlace a la ficha con `?tab=assignments` y al catálogo.
Recepción recibe la explicación para solicitar configuración. No se asignan
automáticamente habilidades ni se eluden los checkboxes.
Actualizar opciones vuelve a consultar sin cerrar el modal.

- UI: modal, selección de sucursal de administrador, venta completa, sucursal fija
  de recepción, reintento con los mismos datos y restauración del desplazamiento.
- `supabase/tests/cash_sales.sql`: venta real en efectivo y transferencia,
  comisión del 30%, idempotencia, precio manipulado sin trabajo huérfano,
  opciones por sucursal, bloqueo de venta/consulta ajena, RLS al cambiar de sucursal,
  anulaciones reservadas a administración y rechazo de rol barbero.
- La prueba crea la cuenta de recepción y todos los datos dentro de una transacción
  con `ROLLBACK`. No deja cuentas, servicios, ventas ni auditoría de prueba.

El acceso de recepción reemplaza el prototipo sin autorización. La agenda y el
portal de barberos continúan pendientes. Transferencias siguen siendo manuales,
sin conciliación bancaria automática. No ejecutar `db push` sin reconciliar
el historial de migraciones aplicado mediante SQL.
