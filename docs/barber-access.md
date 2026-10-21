# Ingreso del barbero y errores de autenticación

El espacio ya incluye el [dashboard personal](barber-dashboard.md). La descripción
del acceso base más abajo corresponde al paso previo; la agenda sigue pendiente.

El ingreso privado acepta usuario o email. Después de verificar credenciales y
rol, dirige administración a su panel, recepción a `/recepcion` y barberos activos
a `/barbero`. Un barbero no obtiene permisos de administración ni acceso a Caja.

El portal del barbero exige sesión y valida rol y estado en servidor con
`get_barber_portal` (migración `20261021021400_barber_portal_access.sql`, aplicada).
La RPC solo devuelve su propia identidad y nombre de sucursal. La agenda y las
herramientas operativas siguen pendientes; se muestra ese estado sin datos ficticios.
El portal permite cerrar sesión y volver a ingresar directamente.

Se corrigió un reinicio durante `onAuthStateChange`: el guard de administración
pasaba a loading en cada evento, desmontaba el formulario y perdía el mensaje de
validación de rol. Ahora conserva el formulario durante esa comprobación.
Las consultas siguen descartando respuestas viejas mediante una generación.

Verificación: redirección de barbero, protección de ruta, conservación del formulario
durante eventos de Auth y prueba real de acceso de la cuenta de prueba mediante
Supabase Auth y `get_barber_portal`. Se verificó que la misma sesión no puede leer
cobros. La sesión temporal de verificación se cerró con alcance local, sin cerrar
otras sesiones del usuario. No se guardaron contraseñas en archivos del proyecto.
