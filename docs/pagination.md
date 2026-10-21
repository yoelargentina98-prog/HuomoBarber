# Paginación de los listados

Todos los listados muestran hasta **20 registros por página**: personal, catálogo,
sucursales, comparativo, ranking semanal, servicios del empleado, condiciones de
remuneración, extras y bonos, actividad, gastos, comisiones y equipo de recepción.
También se paginan los servicios habilitados, tarifas por sucursal, excepciones
de horarios y desglose de servicios del barbero. Las franjas tienen un máximo de
8 por día; los días de la semana y las tarjetas de indicadores son estructuras fijas.
Los selectores de formularios conservan todas sus opciones: no son tablas paginadas.

## Caja

Cobros y pendientes empiezan en **20** cada vez que se abre Caja. Solo estos
listados permiten escribir otra cantidad: enteros de **1 a 200**. Confirmar con
Enter o salir del campo. El límite evita solicitar una tabla ilimitada por accidente.

La consulta aplica fecha, sucursal y medio de pago **antes** de contar y paginar.
Ejemplo: con Transferencia y 45 filas, se consultan hasta 45 transferencias por
página; si hay 65, aparecen 45 en la primera y 20 en la segunda. Cambiar de filtro
vuelve a la primera página y conserva el tamaño elegido. Los filtros permanecen
seleccionados al navegar. No se guarda el tamaño en el navegador.

Las tarjetas de Caja corresponden al día y sucursal completos, independientemente
de la página y del filtro de medio de pago del listado. La cantidad de pendientes
también proviene de un conteo completo.

## Arquitectura

- `Pagination`: controles accesibles, anterior/siguiente, intervalo y total.
- `RemoteCollection`: retiene únicamente la página solicitada, descarta respuestas
  de consultas anteriores, muestra errores y permite reintentar.
- `Paginated`: reutiliza los controles para colecciones de configuración o
  agregados ya disponibles. Divide los registros antes de construir sus filas.
  Los cambios de colección/filtro reinician la página; una reducción ajusta el índice.
- `loadPage`: frontera común para respuestas `{ rows, total, page }`.

`get_management_page` usa una lista cerrada de recursos y parámetros escapados;
no recibe SQL del navegador. Los historiales transaccionales se paginan en
PostgreSQL: servicios, movimientos, condiciones y auditoría de empleados, gastos,
comisiones, cobros y pendientes. Personal, catálogo principal y equipo de recepción
también consultan páginas en servidor. Una ficha no descarga todos los servicios
del mes ni los últimos 100 eventos para calcular indicadores.

`get_employee_month_summary` y `get_cash_day_summary` agregan sobre el período
completo. Los conteos administrativos de personal y de barberos activos en
recepción también son independientes del tamaño de página. El comparativo de
sucursales y resumen semanal conservan sus agregados completos y paginan su
presentación; los editores conservan su configuración y borradores entre páginas.
Las asignaciones guardan todas las casillas seleccionadas, incluidas otras páginas.

Los selectores y editores todavía usan sus límites de configuración preexistentes
(500 servicios/sucursales y hasta 500 asignaciones); no se aumentaron esos límites
de negocio en este cambio. Los agregados de sucursales y equipo conservan su
validación de respuesta de 1000 filas para evitar totales parciales. Esto no limita
la cantidad de trabajos o cobros que pueden recorrerse en sus historiales paginados.

Los permisos se validan en servidor: administración para fichas y costos; recepción
únicamente su sucursal activa. El barbero mantiene su historial propio mediante
`get_barber_service_history`, con páginas fijas de 20. No obtiene acceso a Caja.

El conteo y las filas de cada página usan una misma consulta/snapshot. Hay un orden
estable con ID como desempate. Al registrar movimientos entre consultas, la paginación
por offset puede desplazar registros; actualizar vuelve a consultar el estado actual.

## Migraciones y comprobaciones

Aplicadas a HuomoBarber:

- `20261021022100_paginated_lists.sql`.
- `20261021022200_reception_paging.sql`.

`supabase/tests/paginated_lists.sql` crea 1165 cobros dentro de una transacción,
incluidas 1105 transferencias. Comprueba páginas de 45 sin mezcla de medios ni IDs
repetidos, última página, resúmenes completos y permisos por rol/sucursal. Finaliza
con ROLLBACK; no deja ventas ficticias. Las pruebas de interfaz verifican 20 filas,
cambios de filtro, 45 transferencias por página y conservación de totales y tamaño.
También se comprobó que las selecciones de servicios se guardan entre páginas.
La suite previa de 108 pruebas y el caso adicional de selección entre páginas
pasaron, junto con compilación y lint. En navegador integrado se revisó el portal
del barbero a 390 px, sin desbordamiento horizontal. Captura:
[paginación mobile](screenshots/barber-mobile-pagination.png).

No ejecutar `db push` sin reconciliar el historial de migraciones aplicado mediante SQL.
