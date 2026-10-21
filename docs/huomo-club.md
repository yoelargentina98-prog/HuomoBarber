# HuomoClub: número de cliente y servicios

Implementado y migrado en Supabase el 21/10/2026.

## Identificación

Cada perfil `client` recibe un `customer_number` único, numérico e inmutable. Si al registrarse informa un teléfono de 7 a 15 dígitos, se quitan los separadores y se usa ese valor. Se conservan los prefijos informados: no se adivina país/código de área. Sin teléfono utilizable, se genera un número entre 10000 y 99999. Google usa el mismo trigger de perfiles y obtiene cinco dígitos cuando no suministra teléfono.

Si el teléfono ya identifica a otra cuenta, la nueva cuenta obtiene cinco dígitos. No se fusionan personas por teléfono. Los números generados pueden tener saltos, nunca se reutilizan por borrar un cliente y la capacidad del rango es de 90.000 asignaciones; la secuencia no vuelve al inicio al agotarse. La asignación por teléfono usa bloqueo transaccional para impedir carreras y un índice único como garantía final.

El número permanece fijo aunque se edite el teléfono. Al completar el teléfono después de registrarse, el número generado permanece igual. Ningún cliente puede elegir ni modificar manualmente su número. Los roles internos no tienen número HuomoClub.

El número se muestra en Inicio y Mi perfil. Es una referencia de atención, no una contraseña ni un acceso público a datos personales. El teléfono en el registro público es opcional.

## Nueva venta

Campo opcional “Número de cliente HuomoClub”: busca automáticamente después de una breve pausa y muestra el nombre para comprobar la persona. Un número inexistente o aún no validado impide guardar. Vacío significa cliente ocasional: la venta no genera un perfil ni inventa un historial.

La RPC valida el número nuevamente y vincula `employee_services.client_id` al perfil. Conserva el número como snapshot. Se reutiliza la lógica atómica anterior de tarifa, comisión y cobro; un reintento no puede cambiar de cliente, barbero, importe o método ni duplicar movimientos.

Los servicios completados desde una reserva heredan su cliente y número automáticamente. Las reservas manuales sin cliente registrado continúan sin pertenecer al operador que las creó.

## Historial y privacidad

El cliente ve sus servicios realizados desde Mi perfil. Administración y recepción lo consultan desde el cliente encontrado en Nueva venta → Ver historial del cliente. Recepción solo puede buscar desde su sucursal autorizada y ve servicios de esa sucursal. El cliente no puede consultar otra persona ni enumerar números con la RPC de búsqueda. Los endpoints no exponen comisiones, notas internas, correo ni credenciales.

El historial muestra servicio, sucursal, barbero, fecha e importe; tiene paginación de 20 filas en el servidor. Excluye servicios anulados. Incluye total de servicios, importe de servicios, última atención y días con visitas. Días con visitas cuenta fechas locales distintas, no cada servicio como una visita independiente; todavía no distingue dos visitas distintas el mismo día. No incluye campañas, cupones ni push en esta entrega.

## Migraciones

- `20261021030400_customer_numbers.sql`: número, secuencia, trigger y asignación para clientes existentes.
- `20261021030500_customer_sales_history.sql`: vinculación de ventas, herencia de reservas, búsqueda autorizada e historial paginado.

Aplicadas mediante SQL Management API al proyecto HuomoBarber. No reejecutar automáticamente ni usar db push sin reconciliar el historial previo. No se modificaron las migraciones antiguas ni las tarifas, comisiones o cuentas reales para probar.

Los tipos se regeneraron desde el esquema remoto. `register_cash_sale` mantiene sus parámetros anteriores y agrega `target_client_number` opcional al final; la implementación anterior quedó privada para evitar saltarse la validación.

## Verificación

- `supabase/tests/customer_club.sql`: pruebas en PostgreSQL real con ROLLBACK. Teléfono, cinco dígitos, duplicados, inmutabilidad, roles, venta ocasional, número inválido, reintentos, permisos de sucursal, aislamiento entre clientes y páginas 20/2.
- `supabase/tests/appointments_integration.sql`: comprobación adicional de que la atención hereda el cliente y número de la reserva, junto con las reglas preexistentes de agenda/cobro.
- `src/test/customer-club.test.tsx`: búsqueda automática, vinculación de la venta, rechazo de número inexistente y continuación como ocasional.
- Compilación, lint y suite frontend. Los fixtures de base se revierten; las secuencias pueden avanzar aun cuando se revierte una transacción.

Para actualizar los dispositivos: sincronizar Capacitor después de compilar y generar un APK nuevo. El proyecto iOS se sincroniza, pero su compilación requiere macOS.
