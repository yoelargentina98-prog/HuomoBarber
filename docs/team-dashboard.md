# Mini dashboard de Equipo

En **Equipo**, arriba del listado, se muestran los destacados de una semana de
lunes a domingo, en horario de Argentina. Se puede navegar entre semanas,
elegir una fecha (se toma el lunes correspondiente), volver a la semana actual
y filtrar por la sucursal donde se registró el servicio.

## Métricas

- **Más generó**: suma de los importes registrados de servicios realizados.
- **Más servicios realizó**: cantidad de servicios, independientemente del tipo.
- **Más comisión acumuló**: suma de las comisiones históricas de esos servicios.
- Totales de importe generado, cantidad de servicios, comisión y promedio por servicio.
- Detalle desplegable de los barberos con actividad, ordenado por importe generado,
  con enlaces a la ficha individual. Los empates muestran todos los líderes.

Sin registros se muestra un estado vacío y totales cero. Una comisión total cero
no produce un ganador ficticio. Un fallo de consulta se presenta como error con
reintento, sin mostrar cifras parciales. El filtro de búsqueda y rol del listado
de empleados no afecta las métricas; las métricas tienen sus propios filtros.
El botón **Actualizar resumen** vuelve a consultar los datos.

## Qué se cuenta

Se utiliza `employee_services.performed_at`, con límite inicial inclusivo y final
exclusivo. Se excluyen anulados. Se incluyen barberos actualmente inactivos si
tuvieron servicios en esa semana; el estado de acceso no borra su desempeño.
La sucursal se toma del registro histórico, no de la sucursal actual del empleado.
Los servicios históricos sin sucursal se incluyen en Todas las sucursales y
no en un filtro específico. El nombre del barbero es el actual del perfil.

Los importes representan trabajos registrados, no cobros ni facturación fiscal.
La comisión es generada, no pagada: no incluye fijo mensual, extras, bonos ni
descuentos. No se muestran turnos reservados, cancelaciones ni ausencias porque
todavía no hay agenda. Un turno futuro puede contener varios servicios: esa
métrica deberá calcularse por turno cuando exista su modelo.

## Implementación

`get_team_weekly_stats` agrega en PostgreSQL antes de devolver una fila por barbero.
Esto evita descargar todas las fichas o truncar el historial de servicios en el cliente.
La RPC exige administrador en servidor, una fecha lunes y utiliza zona horaria
`America/Argentina/Buenos_Aires`. No hay permisos para clientes públicos o empleados.
El frontend rechaza respuestas de 1000 o más barberos y enteros fuera del rango
seguro para no mostrar sumas parciales o imprecisas.

Componentes y modelo viven en `src/features/staff/dashboard/`. Las consultas
descartan respuestas de una semana anterior si el usuario ya cambió los filtros.
No se agregan dependencias ni consultas individuales por empleado.

Migración `20261021020900_team_weekly_dashboard.sql` aplicada a HuomoBarber.
No ejecutar `db push` sin reconciliar el historial aplicado mediante SQL.

## Verificación

Pruebas de semanas/cambio de año, líderes independientes, empates, ceros,
totales, enlaces, filtros, carga fallida y recuperación. La prueba SQL
`supabase/tests/team_weekly_dashboard.sql` verifica límites exactos de semana
en Argentina, anulados, filtro de sucursal, sumas y permisos. Usa transacción
con `ROLLBACK`: no deja servicios ni actividad de prueba en los datos reales.
