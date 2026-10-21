# Balance y gastos por sucursal

## Uso

Administración → Sucursales. Los nombres y el enlace **Ver balance y gastos**
abren `/sucursal/:branchId`, dentro del espacio protegido de administración.
Recepción y barberos no tienen acceso a esa ficha ni a los balances.

Debajo de las tarjetas se muestra el **Balance comparativo** del mes elegido:
ingresos cobrados, gastos manuales, comisiones generadas, saldo, mayor recaudación y mejor saldo.
El gráfico usa una escala común para todas las sucursales y coloca los saldos
negativos a la izquierda del cero. Cada importe también se presenta en texto.
Incluye sucursales futuras e inactivas, para no perder comparaciones históricas.
Si hay empate se muestran todos los nombres; sin movimientos no hay líder ficticio.

La ficha de la sucursal incluye datos básicos, selector de mes, balance e historial
de gastos y comisiones por barbero. **Registrar gasto** permite cargar categoría (luz, agua, alquiler, gas,
internet, insumos, mantenimiento, impuestos, fijos y otros sueldos, pago de comisiones u otros), concepto, importe,
fecha de pago, medio (efectivo/transferencia) y notas opcionales.
Se permiten gastos históricos de sucursales inactivas; no se modifica su estado.

Los gastos son pagos ya realizados: no se permiten fechas futuras, importes cero
ni negativos. No se crean facturas por pagar, obligaciones futuras o recurrentes.
Para repetir un alquiler se registra un pago por mes. Una corrección se hace
anulando con motivo y cargando el registro correcto; no se borran gastos.
La fecha de pago determina en qué mes aparece, aunque el concepto mencione otro mes.

## Qué representa el balance

**Saldo operativo estimado = cobros vigentes − gastos manuales − comisiones generadas.**
Los ingresos se toman de Caja por fecha de pago, no de los servicios realizados
sin cobrar. Gastos y cobros anulados se excluyen. La sucursal del cobro es su
snapshot histórico, no la ubicación actual del barbero.

Las comisiones se descuentan automáticamente por fecha del servicio, en horario
de Argentina, usando el importe histórico de cada trabajo vigente. Se incluyen
aunque el servicio todavía no se haya cobrado. No se recalculan con el porcentaje
actual del barbero. La sucursal es la del servicio: trasladar al empleado no mueve
sus costos anteriores.

La sección **Comisiones por barbero** muestra todos los barberos asignados,
incluso con cero servicios, y a quienes tuvieron trabajos históricos en esa
sucursal durante el mes. Cada fila permite abrir la ficha del empleado y muestra
cantidad de servicios y comisión generada.

Para registrar el pago posterior usar **Pago de comisiones (costo ya contemplado)**.
Ese movimiento queda en el historial, pero no vuelve a restarse del balance.
No cargar la misma comisión como sueldo u otro gasto: esas categorías sí restan.
La categoría no liquida ni concilia automáticamente una deuda individual.

No es una ganancia neta ni un saldo bancario/físico: combina cobros con comisiones
generadas y no contempla fondo inicial, retiros ni costos todavía no cargados.
Los fijos y extras no se descuentan automáticamente: sus pagos se registran como
gastos manuales. No es una liquidación de sueldos ni conciliación bancaria.

## Backend

Migraciones `20261021021900_branch_finances.sql` y
`20261021022000_branch_commission_costs.sql`, aplicadas a HuomoBarber.
`branch_expenses`: importes en centavos, sucursal, categoría, fecha, medio, creador,
UUID único de operación y datos de anulación. `branch_expense_audit` guarda actor,
fecha, operación y valores anteriores/nuevos. Lectura mediante RLS solo para admin,
sin escrituras directas para clientes. Las RPC de escritura validan admin en servidor.

`record_branch_expense` serializa por UUID y compara contenido para que un reintento
no duplique el gasto. Si la respuesta fue incierta, actualizar el listado antes
de empezar otro formulario. `void_branch_expense` conserva el registro y exige motivo.
`get_branch_balances` agrega en PostgreSQL, devolviendo una fila por sucursal.
Devuelve ingresos, gastos manuales, comisiones, costo total y saldo. La categoría
`commission_payment` se excluye del gasto manual. `get_branch_commissions`
devuelve el desglose por empleado y exige administración en servidor.
El mes se limita por horario de Argentina en cobros y servicios, y por fecha de pago en gastos.

Gastos y comisiones consultan páginas de 20 en servidor. El comparativo pagina su presentación de sucursales y conserva su validación de 1000 agregados para evitar totales parciales. Ver [paginación](pagination.md). Los totales se calculan en servidor sobre todos los registros del
período, con protección frente a enteros fuera del rango seguro en frontend.

Código modular en `src/features/branches/finance`. Reutiliza formularios,
parseo de dinero, permisos y shell administrativo; el gráfico no agrega librerías.

## Verificación

UI: comparación con saldo negativo y enlaces, formulario de gasto y anulación.
Ruta `/sucursal/:branchId` exige acceso administrativo. La prueba real SQL
`supabase/tests/branch_finances.sql` verifica límites exactos del mes en Argentina,
ingresos por sucursal, gastos, saldo negativo, idempotencia, auditoría, anulación,
rechazo de gastos futuros y permisos. Se ejecuta con ROLLBACK, sin dejar pagos
ni gastos ficticios. `supabase/tests/branch_commission_costs.sql` verifica costos
por sucursal, exclusión de anulados, traslado del barbero, permisos y ausencia de
doble descuento al registrar pagos de comisiones. También se verifican compilación,
lint y pruebas automatizadas (106 pruebas al incorporar este cambio).

No ejecutar db push sin reconciliar migraciones aplicadas mediante SQL.
