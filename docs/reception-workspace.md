# Portal de recepción

`/recepcion` abre un espacio de trabajo con sidebar, identidad del usuario,
sucursal asignada, fecha de Argentina y cierre de sesión. El acceso sigue
requiriendo una cuenta activa de recepción en una sucursal activa.

## Secciones

- **Resumen**: saludo, sucursal, barberos con cuenta activa, total cobrado hoy,
  efectivo y transferencias, acceso a Nueva venta, pendientes de trabajos de hoy
  y vista corta del equipo. Los importes provienen de los cobros reales y excluyen anulados.
- **Caja y ventas**: conserva fecha, medios de pago, historial, pendientes y Nueva venta.
  La acción del resumen abre directamente el modal de venta con sucursal fija.
- **Equipo de la sucursal**: barberos y recepcionistas, nombre, usuario, rol,
  estado de la cuenta y servicios habilitados de cada barbero. Búsqueda por
  nombre/usuario y filtro por rol. No abre fichas administrativas ni permite edición.
- **Agenda**: informa que todavía está pendiente; ofrece volver a Caja.

Cuenta activa no significa presencia, asistencia o disponibilidad horaria actual.
El resumen de cobros usa la fecha local de hoy; el importe es ingreso por servicios,
no saldo físico. Los pendientes son trabajos realizados hoy sin cobro vigente;
para ver días anteriores se usa el filtro de Caja.

Recepción no tiene selector de sucursal ni herramientas para modificar empleados,
roles, asignaciones, remuneraciones o precios. Un administrador que visita el portal
puede elegir la sucursal para consultar resumen/equipo; en Caja conserva sus permisos.
No se modifica la administración ni el portal del barbero.

## Backend

Migración `20261021021700_reception_workspace.sql`, aplicada a HuomoBarber.
`get_reception_team(target_branch)` exige administrador o recepción activa. Para
recepción, la sucursal se resuelve desde su perfil; si se envía otra, se rechaza.
Devuelve únicamente identidad de empleados, rol, estado y nombres de servicios.
No devuelve datos salariales, notas internas, contraseñas, información de Auth
ni teléfonos personales. La RLS de perfiles y remuneraciones se mantiene cerrada.
Incluye cuentas inactivas identificadas como tales para que no desaparezcan del directorio.

El equipo se consulta en páginas de 20, filtrando nombre y rol en servidor. El conteo de barberos activos usa una consulta independiente. No hay consulta individual por empleado. Las respuestas viejas
se descartan al cambiar sucursal. Los errores de equipo o Caja no invalidan la sesión.
Actualizar equipo vuelve a consultar altas y asignaciones; el resumen de Caja se
consulta al abrirlo. No hay actualización en tiempo real todavía.

`get_cash_operator` agrega nombre/usuario del operador a su respuesta; no cambia
sus comprobaciones de rol, estado ni sucursal.

## Código y verificación

Componentes, estilos y servicios en `src/features/reception/workspace`;
`ReceptionLayout` mantiene el control de sesión. Caja, cobros y formularios se reutilizan.
La sidebar se convierte en navegación horizontal desplazable en pantallas pequeñas.

Pruebas de UI: navegación a Equipo, búsqueda, ausencia de selector de sucursal,
venta desde resumen, modal con sucursal fija y fallo recuperable de equipo.
`supabase/tests/reception_team.sql` prueba pertenencia de empleados, aislamiento
entre sucursales, rechazo de recepción inactiva y rol barbero, y ausencia de
remuneraciones. Se ejecuta con ROLLBACK, sin dejar cuentas ni datos de prueba.

No ejecutar db push sin reconciliar migraciones aplicadas mediante SQL.
