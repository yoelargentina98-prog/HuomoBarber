# Dashboard personal del barbero

Ver [versión móvil e historial completo](barber-mobile.md): navegación inferior,
tarjetas con todos los importes y páginas para recorrer todos los trabajos.
La referencia a veinte trabajos más abajo describe la versión inicial; el historial
actual permite consultar todas las páginas de la semana.

Al iniciar sesión en `/barbero`, cada barbero ve Mi caja con su producción real.

## Navegación y presentación

El portal tiene sidebar con identidad, iniciales, sucursal y cierre de sesión.
Mi resumen reúne bienvenida, métricas y actividad. Mi caja concentra comisión,
fijo positivo y desglose de servicios. Mis servicios muestra el desglose;
Mi historial muestra los últimos trabajos; Mi agenda conserva el aviso de módulo
pendiente. No se agregan rutas administrativas ni permisos nuevos.
La semana seleccionada se conserva al navegar entre secciones porque el componente
de datos no se desmonta. La navegación usa botones con `aria-current`, foco visible
y enlace para saltar al contenido. En pantallas pequeñas el menú pasa a una fila
desplazable, sin una sidebar que reduzca el espacio de las métricas.
La bienvenida usa la identidad real del perfil y la fecha del encabezado usa Argentina.

## Métricas

- Comisión semanal generada, cantidad e importe de servicios realizados, sin anulados.
- Desglose de cada servicio asignado, incluyendo cero trabajos.
- Los trabajos de servicios ya no asignados se conservan como históricos.
- Actividad por día y últimos veinte servicios de la semana.
- Fijo mensual solamente cuando el importe es positivo. Si falta o es cero, no
  se muestra tarjeta, título ni mensaje de fijo.

Semana de lunes a domingo en Argentina. El fijo corresponde al mes actual, con
configuración vigente al primer día, sin prorrateo. Es independiente de la semana
seleccionada y nunca se suma a una comisión semanal como si fueran el mismo período.
La comisión usa el snapshot original del servicio, no el porcentaje actual.
Mi caja representa producción y comisión generada, no pagos de sueldo, saldo físico
ni cobros a clientes. Extras, bonos y descuentos no se incluyen.

## Próximos turnos

El panel informa que la agenda todavía no está implementada. No se inventan
reservas ni se muestra un falso sin turnos. Cuando exista el circuito de agenda,
se deben consultar exclusivamente los turnos del barbero autenticado.

## Implementación y seguridad

Migración `20261021021500_barber_dashboard.sql`, aplicada a HuomoBarber.
RPC `get_barber_dashboard(week_start)`, sin identificador de empleado como entrada:
solo usa `auth.uid()` y exige barbero activo mediante `get_barber_portal`.
Las tablas administrativas conservan su RLS, sin abrir permisos generales.

PostgreSQL agrega todos los servicios del período antes de devolver un documento
JSON. No se trunca el historial para calcular totales. Solo la lista reciente
está limitada explícitamente a veinte. Las fechas usan America/Argentina/Buenos_Aires,
inicio inclusivo y final exclusivo. Se valida lunes e importes enteros seguros.

Componentes pequeños en `src/features/barber/dashboard`. Cambiar semana descarta
respuestas viejas. Un fallo del resumen no cierra sesión y muestra reintento,
sin números parciales. Actualizar mi resumen consulta ventas nuevas de recepción;
no hay suscripción en tiempo real todavía.

## Verificación

Pruebas de UI: servicios sin trabajos, fijo nulo/cero oculto, fijo positivo con mes,
cambio de semana y fallo de consulta.
`supabase/tests/barber_dashboard.sql` verifica conteos, comisión, historial no asignado,
servicio asignado en cero, anulados excluidos, fijo e aislamiento entre dos barberos.
Todos los datos de prueba se revierten con ROLLBACK.
Compilación, tipos, lint y suite automatizada completan los controles.

No ejecutar db push sin reconciliar las migraciones aplicadas mediante SQL.
