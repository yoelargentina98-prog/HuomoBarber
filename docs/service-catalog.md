# Catálogo de servicios y habilitación de barberos

Actualización: [sucursales y tarifas](branches.md). El catálogo es único, pero el
precio y la disponibilidad se configuran por sucursal en Precios por sucursal.
Cada barbero pertenece a una sola y usa sus tarifas. El campo price_cents del
catálogo quedó como legado: no se usa como precio vigente.

## Operación

1. En **Servicios** (`/admin/servicios`), crear los servicios de la barbería con
   nombre, duración, categoría estadística y descripción opcional. Luego configurar
   **Precios por sucursal**: tarifa y disponibilidad de cada ubicación.
2. En **Equipo**, asignar una sucursal al barbero en Datos y acceso, y entrar en **Servicios habilitados**.
3. Tildar los servicios que realiza y pulsar **Guardar servicios del barbero**.
   Destildar todos es válido; el barbero queda sin servicios habilitados.
4. En el historial **Servicios**, registrar un trabajo eligiendo entre sus
   servicios activos asignados. El formulario propone el precio de su sucursal,
   ajustable para ese trabajo. La comisión única del empleado sigue vigente.

El catálogo comienza vacío. No se crearon nombres, precios ni asignaciones reales
sin definición del propietario. La categoría (corte/barba/otro) sirve para
estadísticas, no cambia el porcentaje de comisión. Cejas y color pueden crearse
como servicios diferentes dentro de Otros.

Recepción no tiene checkboxes de servicios: la asignación corresponde a barberos.
La ficha del barbero contiene tanto su selección habilitada como el historial
de servicios que ya realizó; son conceptos distintos.

## Reglas

- Un servicio debe existir antes de asignarlo. Se usan IDs, no nombres escritos
  libremente ni copias del catálogo por barbero.
- El nombre es único, ignorando mayúsculas y espacios exteriores, incluso entre
  inactivos. Para recuperar un servicio existente, reactivarlo.
- Solo se pueden agregar servicios activos. Una asignación previa de un servicio
  que luego se desactiva se conserva; puede destildarse, pero no registrarse como
  trabajo nuevo mientras el servicio esté inactivo.
- Destildar elimina la habilitación, no el historial. Desactivar en el catálogo
  impide nuevos registros para todos los barberos y conserva las asignaciones.
- No hay borrado físico desde la aplicación. Las claves foráneas protegen las
  referencias a catálogo y empleados.
- Al registrar un trabajo se guardan ID de catálogo y una instantánea de nombre,
  categoría, importe y comisión. Renombrar o cambiar el precio del catálogo no
  altera servicios realizados.
- Los registros históricos anteriores a este módulo conservan sus datos, con
  service_id nulo. No se crearon servicios del catálogo a partir de textos antiguos.

## Datos y autorización

`service_catalog` es el catálogo central. `barber_services` es una relación
muchos-a-muchos con clave primaria `(employee_id, service_id)` y claves foráneas.
`employee_services.service_id` vincula el trabajo realizado con el catálogo.

Ambas tablas tienen RLS y acceso administrativo. El catálogo admite lectura,
creación y edición del admin, pero no eliminación. La relación solo admite
lectura directa: toda escritura pasa por `set_barber_services`, que comprueba
rol admin, barbero existente, IDs válidos y disponibilidad. Guarda el conjunto
completo en una transacción y bloquea la ficha para serializar cambios concurrentes.
Sus altas y bajas quedan en la auditoría del empleado, con nombre del servicio.

El alta libre anterior `record_employee_service` quedó sin permiso para clientes
autenticados. La nueva RPC `record_catalog_service` comprueba barbero activo,
asignación y servicio activo; aplica la comisión única vigente y preserva la
instantánea histórica. No se puede evitar la asignación manipulando el formulario.

Las políticas públicas para mostrar catálogo o disponibilidad en reservas todavía
no están implementadas; este módulo es exclusivamente administrativo.

## Código

`features/catalog/services/catalog-service.ts` concentra acceso a datos;
`hooks/useCatalog` comparte carga y descarte de respuestas viejas;
`CatalogPage` y `CatalogForm` gestionan catálogo; `BarberServicesPanel` muestra
checkboxes; `RecordServiceForm` solo permite elegir servicios habilitados.
El formulario de guardado y la lectura de FormData se movieron a `shared` para
reutilizarlos en catálogo y fichas sin duplicar lógica. Sus estilos están en
`src/styles/forms.css`. Los componentes visuales no consultan Supabase directamente.

## Migraciones y estado remoto

Se aplicaron en HuomoBarber mediante Management API:

- `20261021020400_service_catalog.sql`.
- `20261021020500_record_assigned_service.sql`.

No es necesario que el propietario ejecute SQL ni despliegue una función nueva.
Se regeneraron los tipos TypeScript desde el esquema real. Antes de usar db push,
reconciliar el historial de los scripts aplicados por SQL Editor/Management API.

## Verificación y límites

Resultado local: 59 pruebas aprobadas; compilación y lint correctos. Se abrió el
catálogo real en navegador y se revisó el formulario, sin crear registros de ejemplo.

Las pruebas de interfaz cubren creación, checkboxes, selección completa, desmarcado
total, catálogo vacío, inactivos y selección para registrar trabajos.
La prueba SQL transaccional de empleados ahora crea catálogo temporal y verifica
servicios inexistentes, inactivos, no asignados, barbero inválido, auditoría,
comisión única, redondeo y conservación histórica. Finaliza con ROLLBACK: no deja
servicios, importes ni asignaciones ficticias en el proyecto.

El catálogo principal consulta páginas de 20 en servidor. Los editores de configuración mantienen el límite de 500 servicios; al superar ese límite informa error para
evitar un selector parcial. La duración va de 5 a 1440 minutos. No hay todavía
precios por barbero, variaciones por fecha ni disponibilidad de agenda.
