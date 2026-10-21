# Sucursales, tarifas y pertenencia de empleados

## Estado remoto

Se aplicaron las migraciones `20261021020600_branches.sql` y
`20261021020700_branch_service_rules.sql` en HuomoBarber. Se crearon **Irigoyen**
y **Mosconi**, activas, sin inventar dirección, teléfono ni precios.
Se actualizó y desplegó `create-staff` para validar la sucursal de los nuevos barberos.
El propietario no necesita ejecutar SQL.

Yoel y otros empleados anteriores quedaron con sucursal pendiente: no se conoce
su pertenencia. No se los asignó arbitrariamente. Deben elegirla en su ficha antes
de habilitar servicios o registrar nuevos trabajos.

## Operación

1. **Sucursales** (`/admin/sucursales`): crear nuevas, editar nombre/dirección/teléfono,
   desactivar o reactivar. El modelo no tiene un límite de dos sucursales.
2. **Servicios**: crear cada servicio una sola vez con nombre, descripción,
   categoría estadística y duración. No existe un precio global vigente.
3. En la fila del servicio, **Precios por sucursal**: ingresar cada tarifa y tildar
   su disponibilidad. Puede ofrecerse en Irigoyen y no en Mosconi, o al revés.
   Un servicio disponible debe tener precio; un 0 explícito permite servicios gratuitos.
4. **Equipo → Empleado → Datos y acceso → Sucursal del empleado**: elegir una sola.
   Las nuevas altas de barberos ya exigen una sucursal activa en el formulario.
5. **Servicios habilitados**: tildar entre los servicios configurados para esa
   sucursal. Al registrar el trabajo se propone el precio de esa ubicación.

Agregar una sucursal no copia precios ni habilita servicios automáticamente.
El administrador configura sus tarifas desde cada servicio. Los importes globales
del esquema anterior permanecen como legado y no se usan como tarifas: no se
asumió que correspondieran a una sucursal determinada.

## Reglas y conservación histórica

- Cada empleado tiene un solo campo `profiles.branch_id`, no una relación múltiple.
  El rol admin puede quedar sin sucursal y administrar todo el negocio.
- Todo barbero nuevo debe pertenecer a una sucursal activa. La recepción puede
  tenerla asignada, pero su creación no la exige todavía.
- `branch_services` define precio y disponibilidad por par sucursal/servicio.
  El precio no vive en el perfil del barbero ni se duplica el catálogo general.
- La comisión porcentual sigue perteneciendo al empleado. Se aplica al importe
  registrado de cualquier servicio, independientemente de la categoría.
- Un traslado conserva los checkboxes compatibles con la sucursal de destino y
  quita los servicios que allí no están disponibles/con precio. No mueve ni modifica
  trabajos anteriores. El cambio queda en la auditoría de la ficha.
- Cada nuevo trabajo guarda `branch_id`, `branch_name`, servicio, importe y comisión
  como instantáneas. Cambiar nombre/precios o trasladar al empleado no cambia ese trabajo.
- Los trabajos anteriores al módulo quedan sin sucursal histórica; se muestran
  como tales, sin atribuirlos a una ubicación que no se conoce.
- Desactivar una sucursal impide nuevos trabajos en ella, sin borrar empleados,
  tarifas, asignaciones ni historial. No equivale a bloquear la cuenta Auth del empleado.

## Seguridad y transacciones

`branches` y `branch_services` tienen RLS administrativo; no hay lectura pública
ni acceso para empleados comunes desde este módulo. No se permite borrar sucursales.
Las claves foráneas preservan referencias y evitan sucursales/servicios inexistentes.

Las tarifas se guardan mediante `save_service_branch_prices` en una transacción.
Las sucursales habilitadas deben existir y estar activas, y se exige precio para
disponibilidad. La relación de tarifas no acepta escrituras directas del cliente.

La RPC `save_employee_branch` comprueba admin, empleado y sucursal. La ubicación
no se puede editar directamente desde el frontend. Un trigger exige pertenencia
a los barberos nuevos o cuando se cambia su rol/sucursal. Se preservan las filas
anteriores sin sucursal hasta su asignación explícita.

La asignación de servicios y el registro de trabajos bloquean la ficha para
serializarse con los traslados. `record_catalog_service` verifica sucursal activa,
precio configurado, disponibilidad y habilitación del barbero, además de su
remuneración vigente. El navegador no decide estas autorizaciones.

## Código y verificación

Resultado: 65 pruebas aprobadas, tipos y compilación de frontend correctos, lint
y formato correctos. `create-staff` pasó comprobación de tipos Deno y fue redeplegada.
La pantalla de sucursales se verificó en navegador con Irigoyen y Mosconi reales.

`features/branches` reúne CRUD, selector reutilizable, configuración de precios y
asignación al empleado. `features/catalog` adapta los servicios al contexto del
barbero, sustituyendo el precio de legado por el de su sucursal. Los tipos se
regeneraron desde Supabase. Los componentes usan servicios, no consultas directas.

Las pruebas de interfaz verifican creación de una tercera sucursal, tarifas
diferentes, rechazo de disponibilidad sin precio y la solicitud de sucursal antes
de habilitar servicios. El contrato y la función de altas validan pertenencia.

La prueba SQL transaccional verifica traslado, eliminación de habilitaciones no
compatibles, conservación de sucursal histórica y comisión con precio diferente.
Todos los cambios de prueba terminan en ROLLBACK. No se fijaron tarifas, porcentajes
ni sucursal reales para Yoel.

## Límites actuales

Los precios son los vigentes al cargar el trabajo, no tarifas históricas por fecha.
El importe del trabajo puede ajustarse manualmente para descuentos u otros acuerdos.
La carga retroactiva utiliza la sucursal actual del empleado: no deduce una ubicación
anterior por fecha. Los registros ya cargados conservan su instantánea original.

Agenda, caja y reservas deberán asociarse a sucursal cuando se implementen. No hay
todavía un selector global para filtrar todo el dashboard. La vista admite hasta
500 sucursales; si se supera, se informa que falta paginación, sin asumir dos.

Las migraciones se aplicaron mediante Management API. Antes de adoptar db push,
reconciliar su historial con los archivos versionados; no volver a ejecutarlos.
