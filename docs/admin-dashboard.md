# Administración y separación de rutas

Caja está habilitada en `/admin/caja`: ver [cobros y medios de pago](cash.md).
El catálogo, las sucursales, las fichas, los horarios y el dashboard de Equipo
también están implementados. Las verificaciones al final describen el sprint
original de separación de rutas, no el estado completo actual.

La ruta `/admin/personal/:employeeId` abre la [ficha individual](employee-records.md)
desde el nombre del empleado en Equipo o en el resumen.

## Rutas vigentes

| Ruta                      | Uso                                                                          |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/`                       | Reserva mínima para la futura landing. No se construyó la landing.           |
| `/reservar`               | Portal público de reservas, todavía en preparación.                          |
| `/admin`                  | Acceso privado. Sin sesión muestra ingreso; con rol admin muestra dashboard. |
| `/admin/personal`         | Equipo: listado, búsqueda por nombre/usuario/teléfono y filtro por rol.      |
| `/admin/personal?nuevo=1` | Equipo con formulario de alta abierto.                                       |
| `/recepcion`              | Caja de recepción con acceso por usuario y sucursal fija.                    |
| `/barbero`                | Prototipo conservado, sin enlace público.                                    |

Se eliminó el hub de portales y la navegación global por roles. El sitio público
no muestra enlaces de acceso interno. Conocer una URL no concede permisos: el
espacio administrativo valida la sesión y el rol, y el backend mantiene sus controles.
Recepción tiene acceso funcional a Caja de su sucursal; el portal de barberos sigue pendiente.

## Arquitectura

- `AdminLayout` verifica acceso mediante `useAdminAccess` y monta el espacio privado.
- `AdminShell` contiene navegación lateral, encabezado y cierre de sesión.
- `StaffProvider` consulta el equipo una vez y comparte sus datos con dashboard y listado.
- `AdminHomePage` muestra conteos del equipo y accesos operativos.
- `StaffPage` gestiona búsqueda, filtro y apertura del formulario.
- `StaffList` presenta la tabla o un estado vacío, reutilizado en el dashboard.
- Los estilos se separan por shell, sidebar, resumen, paneles, ingreso y personal.

La sesión y los datos tienen estados independientes. Un fallo al listar personal
no invalida la sesión ni vuelve a mostrar el login. El administrador permanece
dentro del sistema, con un mensaje y opción de reintentar. Si falla la consulta
del rol, se muestra un error de acceso separado, sin afirmar que la contraseña falló.

El listado tiene compatibilidad de lectura con profiles antes de la columna
username: si falta esa columna, consulta los campos del esquema inicial. Esto no
sustituye la migración necesaria para crear cuentas con usuario.

## Datos y funcionalidades

Los conteos se consultan en Supabase independientemente de las páginas del listado de personal.
No se muestran ingresos, turnos o gráficos inventados. Agenda se identifica
como próximo módulo; Servicios, Sucursales y Caja tienen rutas funcionales.
El frontend usa carga diferida para las rutas de administración.

**El alta real sigue requiriendo la migración de usernames y el despliegue de
create-staff**: ver [activación del backend](staff-management.md). Esta corrección
no desplegó recursos remotos ni creó cuentas de empleados.

## Verificación

Se verificaron en navegador, con la sesión administrativa existente, el dashboard
y la apertura del formulario desde Agregar empleado. La consulta del equipo
respondió con una lista vacía, sin devolver al administrador al ingreso.
Las pruebas de rutas cubren ausencia de enlaces públicos, acceso directo privado,
dashboard autorizado y el fallo de datos que antes se confundía con falta de sesión.
No se enviaron formularios de alta ni se introdujeron contraseñas en las pruebas visuales.

Resultado local: 38 pruebas aprobadas, compilación con revisión de tipos, lint y
formato correctos. [Captura del dashboard revisado](screenshots/admin-dashboard.png).

Para validar manualmente: abrir `/` y confirmar que no hay enlaces internos;
abrir `/admin` con/sin sesión; abrir Equipo desde Resumen; usar búsqueda y filtro;
simular una falla de datos y comprobar que el login no reemplaza al dashboard.
