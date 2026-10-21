# Ficha individual del empleado

Actividad muestra una sola comisión por servicio. Los campos históricos por corte,
barba y otros se conservan en la auditoría original pero no se presentan en la ficha,
ya que no intervienen en el cálculo de remuneración.

La ficha incluye [sucursal del empleado](branches.md) en Datos y acceso. Los
servicios habilitados y sus precios se toman de esa sucursal. Los empleados
anteriores sin ubicación quedan pendientes hasta asignación administrativa.

El registro de trabajos ahora se vincula al [catálogo central](service-catalog.md).
La pestaña Servicios habilitados permite asignar por checkboxes solo servicios
existentes. El registro libre de nombres quedó reemplazado por selección de catálogo.

## Recuperación ante cambios locales

Se corrigió una transformación en caché de Vite que servía ServicesPanel como
módulo vacío durante un guardado. Se reinició el servidor con `--force` y se
configuró `server.watch.awaitWriteFinish` para esperar escrituras estables.
Las rutas públicas y administrativas incluyen una pantalla de recuperación en
vez del error técnico de React Router. Si una pestaña conserva módulos anteriores,
recargar con Ctrl+Shift+R; no requiere cambios SQL.

## Estado y acceso

Implementado y conectado a HuomoBarber. Desde Equipo, pulsar el nombre para abrir
`/admin/personal/:employeeId`. La ficha muestra un número estable (`Empleado #0001`)
y el UUID completo. Sus datos económicos y laborales son privados de administración.

Las migraciones `20261021020000_employee_records.sql`,
`20261021020100_employee_operations.sql` y `20261021020200_employee_access.sql`
fueron **aplicadas en Supabase** por Management API. `update-staff` fue **desplegada**.
El propietario no debe ejecutar otra vez estos scripts. Las fichas existentes se
crearon al migrar; un trigger las crea automáticamente para futuras altas.

Antes de usar `db push`, reconciliar el historial de migraciones aplicadas por SQL
Editor/Management API. No volver a ejecutar los archivos de creación.

## Secciones

- **Resumen:** servicios, cortes, barbas e importe del mes; categorías y estimado.
- **Servicios:** registro manual de trabajos realizados, categoría, fecha/hora
  argentina, importe y notas. Anulación con motivo, sin borrar historial.
- **Remuneración:** fijo mensual y una única comisión por servicio, sin diferencias por categoría. Historial por mes de vigencia.
- **Extras y bonos:** movimientos mensuales, incluyendo descuentos. No son pagos
  ni egresos de caja. Se pueden anular con motivo.
- **Datos y acceso:** nombre, teléfono, ingreso, notas y desactivación/reactivación.
  El nombre de usuario no se modifica desde esta ficha.
- **Actividad:** últimos 100 cambios de administración, campos, fecha y actor.

El selector de período filtra servicios y movimientos por mes. La actividad y las
condiciones no se limitan al período. No hay registros ni métricas ficticias.

## Reglas de cálculo

1. Moneda ARS. Se guardan **centavos enteros**. Los formularios aceptan coma o punto
   decimal, sin separadores de miles.
2. Las condiciones rigen desde el primer día del mes elegido hasta una nueva
   configuración. Guardar el mismo mes actualiza ese registro y deja auditoría.
3. Antes de registrar un servicio debe existir configuración vigente a su fecha.
   El servidor aplica commission_percent a cualquier servicio del empleado. Un 0 es una comisión del 0% explícita.
4. El servicio conserva su porcentaje y comisión en centavos, redondeada por
   servicio en Postgres. Cambiar condiciones no recalcula trabajos previos.
   Para corregir un trabajo, anularlo y registrar uno nuevo.
5. El fijo se toma completo, sin prorrateo por ingreso, asistencia o desactivación.
6. Estimado = fijo + comisiones válidas + extras + bonos − descuentos.
   Los anulados permanecen visibles pero no suman.
7. Es una estimación interna. No existen todavía liquidaciones cerradas, pagos a
   empleados, impuestos ni recibos de sueldo.

La desactivación bloquea nuevos servicios y nuevos ingresos en Auth; conserva los
registros e importes previos. Los JWT existentes pueden durar hasta su vencimiento:
los futuros módulos de empleados también deberán validar el estado activo por RLS.

## Datos y permisos

Tablas: employee_details, employee_compensation, employee_services,
employee_adjustments y employee_audit. Todas con RLS y lectura solo para admin.
Barberos y recepción no tienen acceso a remuneraciones desde este módulo, incluida
su propia ficha. Su eventual vista personal necesitará políticas específicas.

Servicios y movimientos se escriben por RPC con comprobación de admin. No se puede
editar directamente la comisión histórica ni borrar registros. Nombre/teléfono e
ingreso/notas se actualizan atómicamente por RPC. Triggers generan la auditoría;
el cliente no puede modificar esa tabla.

`update-staff` verifica JWT, rol admin y que el destino sea barbero/recepción.
Actualiza el bloqueo Auth y luego la ficha. Si falla la segunda operación intenta
restaurar el bloqueo anterior; si también falla la restauración registra solo UUID
para intervención manual. La RPC de estado es exclusiva de service_role y registra
al administrador solicitante. Las claves privilegiadas permanecen en el servidor.

## Organización

`features/employees/model`: importes, períodos, tipos y resumen puro.
`services`: consultas y escrituras; `hooks`: carga y descarte de respuestas antiguas.
`components`: una sección por archivo, formulario de guardado y anulación reutilizados.
`pages/EmployeePage`: composición. Las rutas usan carga diferida y los componentes
no consultan Supabase directamente.

`database.generated.ts` se generó desde el esquema real usando Supabase CLI. Es una
excepción deliberada al límite de líneas: no se edita ni divide manualmente la salida
del generador. `types.ts` mantiene exportaciones estables. Los archivos manuales
siguen siendo pequeños.

## Verificación

- Resultado local: 54 pruebas aprobadas; tipos, compilación y lint correctos.
- Interfaz: enlace por nombre, ID, datos, tabs, formularios y errores recuperables.
- Cálculo: centavos, porcentajes, límites mensuales en Argentina, cambio de año,
  vigencias, anulaciones, categorías y total estimado.
- `supabase/tests/employee_records.sql` se ejecutó contra la base real y verificó
  redondeo, comisión histórica, anulación, auditoría y denegación a barberos/anon.
  Terminó con ROLLBACK: no dejó importes ni servicios de prueba.
- Se abrió la ficha real de Yoel en navegador y se revisaron sus secciones. No se
  asignaron porcentajes, fijos o bonos reales. No se modificaron credenciales,
  roles ni el estado de acceso de empleados reales.
- El bloqueo Auth se revisó en código y con Deno; probar un bloqueo/ingreso real
  requiere una cuenta descartable, no se desactivó al empleado del propietario.

## Límites

Los servicios se cargan manualmente hasta implementar agenda y caja. No implican
que el cliente haya pagado. Se vinculan al catálogo normalizado y deben estar
asignados al barbero. Todavía no se vinculan a clientes. Al integrar agenda,
reutilizar las reglas y la instantánea de comisión, evitando duplicar un mismo trabajo.

Servicios, movimientos, condiciones y auditoría se consultan en páginas de 20 en servidor. El resumen mensual se calcula en PostgreSQL sobre todos los registros, sin depender de la página. La auditoría permite recorrer el historial completo. Ver [paginación](pagination.md). Exportación pendiente.

Ante respuesta de red incierta al registrar, revisar el historial antes de repetir:
no existe aún una clave de idempotencia para reintentos automáticos.

## Corrección: comisión única por servicio

Se aplicó en Supabase la migración 20261021020300_uniform_employee_commission.sql.
Cada empleado tiene un único porcentaje sobre el importe de cualquier servicio.
La categoría se utiliza solo para estadísticas, no para definir la comisión.
Los campos antiguos por categoría se conservan como legado, ignorados por el cálculo
y fuera de los formularios; no se borraron datos ni recalcularon servicios históricos.
Se verificaron cortes, barbas y otros servicios con el mismo porcentaje en una
transacción revertida. No se asignó 30% a ningún empleado: fue un ejemplo del usuario.

# Horarios de actividad

La ficha de barberos incluye **Horarios**, independiente del período de remuneración.
Permite semana habitual y excepciones por fecha. Ver [guía y límites](barber-schedules.md).
