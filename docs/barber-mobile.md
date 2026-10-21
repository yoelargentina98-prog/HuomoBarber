# Portal del barbero en celular

## Diseño

En anchos de hasta 800 px se utiliza una cabecera compacta con nombre/sucursal y
cierre de sesión, y una navegación inferior fija de cinco secciones. Se incluyen
espacios seguros para dispositivos con notch y barra del sistema (`safe-area-inset`).
El contenido inferior reserva espacio para que la navegación no oculte el final.
Cambiar de sección vuelve al inicio de la página y conserva la semana seleccionada.
El escritorio mantiene sidebar y tablas.

Servicios e historial se reorganizan visualmente en tarjetas de dos columnas,
con nombre completo, fecha/sucursal cuando corresponde y etiquetas junto al importe
y la comisión. La tabla conserva sus encabezados semánticos para tecnologías de
asistencia. No se ocultan columnas, no se recortan nombres con puntos suspensivos
y los importes largos pueden ajustarse a varias líneas. La comisión se destaca
con fondo verde claro. No hay desplazamiento horizontal de tablas en móvil.

Botones principales de al menos 46 px, navegación de al menos 60 px y controles
de fecha con fuente de 16 px. Las cuadrículas admiten contenido largo con
`minmax(0,1fr)` y `overflow-wrap`, sin usar ocultación global de desbordamientos
para disimular problemas. No se deshabilita el zoom del navegador.
Los textos de bienvenida se reducen en móvil para priorizar la información útil.

## Visibilidad completa del historial

El historial anterior mostraba solo los veinte últimos trabajos de la semana.
Ahora **Todos mis servicios** permite recorrerlos por páginas de veinte, con
contador y controles Anteriores/Siguientes. El servicio muestra importe original,
comisión original, fecha y sucursal. Los anulados no cuentan ni aparecen en ese
historial de producción. Los totales semanales siguen incluyendo todos los trabajos
y no se calculan sobre una sola página.

RPC `get_barber_service_history(week_start,page_number)`, migración
`20261021021800_barber_history_pages.sql` aplicada a HuomoBarber. La identidad
sale siempre de `auth.uid()`; no acepta identificador de otro empleado. Exige
barbero activo. Orden estable por fecha descendente e ID, total y página en la
misma consulta. La paginación usa offset: si se insertan o anulan trabajos mientras
se navega, actualizar el resumen para revisar el conjunto actualizado.

Mi caja sigue representando comisión generada y producción, no saldo de sueldo
pagado o dinero bancario. El fijo mensual positivo se muestra por separado, sin
sumarlo a la comisión de una semana. Si no hay fijo, no aparece.

## Verificación realizada

Navegador Chromium integrado con viewport de 320, 360, 390 y 430 px. Se revisaron
Resumen, Caja, Servicios, Historial y Agenda. En las veinte combinaciones, el ancho
de documento no superó el ancho disponible y no hubo importes con contenido
horizontal recortado. Se repitió la verificación del historial tras cargar sus datos.
Se utilizaron los datos reales de prueba existentes, sin agregar ventas ficticias.
Esto no reemplaza una prueba física en Safari/iOS o del teclado del dispositivo.

Pruebas UI: navegación entre páginas, totalidad superior a veinte trabajos,
importes extensos y error recuperable. Prueba SQL `supabase/tests/barber_history_pages.sql`:
25 registros, conteos, páginas sin IDs repetidos, página inválida y aislamiento
de sesión. Se revierte todo con ROLLBACK. Compilación, lint y suite de pruebas.

Capturas: `docs/screenshots/barber-mobile-cash.png` y `barber-mobile-history.png`.
