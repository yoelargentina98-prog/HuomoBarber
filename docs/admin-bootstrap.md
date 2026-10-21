# Alta del administrador inicial

## Estado de esta entrega

La cuenta de Auth fue creada por el propietario. La migración fue revisada y
corregida localmente, pero **no fue ejecutada en Supabase desde esta entrega**.
No hay conexión administrativa disponible. No se leyeron ni modificaron credenciales.

## Aplicación

1. Abrir SQL Editor en el proyecto correcto de Supabase, usando el rol postgres.
2. Copiar y ejecutar completo
   `supabase/migrations/20261020220500_create_profiles_and_roles.sql`.
3. Ejecutar `supabase/verify-admin.sql` y comprobar sus resultados esperados.

El script usa una transacción: si falta el usuario, revierte los cambios.
Puede ejecutarse nuevamente sobre el esquema que este mismo script crea.
Si se aplicó manualmente, registrar esa aplicación antes de adoptar CLI: no
asumir que SQL Editor actualiza el historial de migraciones de Supabase CLI.

## Permisos

- Los visitantes anónimos no tienen acceso a profiles.
- Los empleados pueden leer su perfil y actualizar sus datos personales.
- No pueden cambiar la identidad del perfil ni su propio rol.
- Los administradores pueden gestionar otros perfiles mediante RLS.
- El rol SQL postgres y el backend con service_role pueden asignar roles.
  Estas credenciales nunca deben incorporarse al frontend.
- Los perfiles nuevos no reciben rol automáticamente. La creación de Auth no
  crea por sí sola una fila en profiles en esta versión.

Se corrigió el trigger para ejecutarse como SECURITY INVOKER: así reconoce al
rol SQL que ejecuta la operación. La función is_admin sigue siendo SECURITY
DEFINER para evitar recursión de RLS, con search_path vacío y referencias
calificadas. Se hicieron explícitos los permisos de tabla y función.

## Verificación pendiente

No se ejecutaron pruebas SQL ni de RLS: requieren una base Supabase de prueba.
La consulta de verificación comprueba asignación y configuración, pero no
sustituye pruebas con sesiones de distintos roles antes de habilitar acceso real.
No se cambió el frontend: las rutas siguen sin autenticación.
