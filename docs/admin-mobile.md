# Administración en celulares y tablets

La administración adapta su presentación hasta **900 px**. Por encima se conserva
la sidebar de escritorio. Los permisos y las consultas de Supabase son los mismos;
este cambio no requiere migraciones.

## Navegación y lectura

- Barra inferior fija con Resumen, Equipo, Servicios, Sucursales y Caja. La ficha
  de un empleado mantiene Equipo activo; `/sucursal/:id` mantiene Sucursales.
- Encabezado compacto y fijo, con sección actual y cierre de sesión accesible.
- Espacio inferior y márgenes que respetan `safe-area-inset-*`, evitando que la
  barra tape el final del contenido. Al cambiar de ruta en mobile se vuelve al inicio.
- Botones de al menos 44 px y campos de al menos 46 px. Los campos usan fuente de
  16 px para evitar el zoom por tipografía pequeña en navegadores móviles.
- Formularios en una columna y pestañas del empleado distribuidas en dos columnas,
  sin tener que desplazar una tira horizontal para encontrar una sección.

Las tablas de personal, catálogo, servicios, condiciones, extras, cobros, pendientes,
gastos, comisiones y ranking se presentan como tarjetas. Cada celda tiene una
etiqueta `data-label`, y la tabla conserva sus encabezados para accesibilidad.
Nombres, referencias, notas e importes pueden ocupar varias líneas; no se ocultan
columnas para hacer entrar la tabla. La paginación de 20 se conserva, con el tamaño
editable de Caja según [paginación](pagination.md).

Los gráficos de sucursales ubican el importe junto a la etiqueta y la barra debajo.
Las métricas y filtros cambian de columnas según el espacio disponible. El modal
de venta limita su alto con `100dvh`, permite desplazamiento interno y conserva
el fondo borroso y el foco gestionado por el diálogo nativo.

## Organización del código

Los estilos se limitan a `.admin-workspace` para no cambiar la presentación de los
portales de recepción y barbero:

- `mobile-navigation.css`: encabezado, sidebar y navegación inferior.
- `mobile.css`: composición, tarjetas, filtros, pestañas y formularios.
- `mobile-tables.css`: tablas como tarjetas, horarios, listas y modal.
- `mobile-access.css`: acceso privado adaptable y campos legibles.

El acceso privado es compartido entre roles y recibe la misma mejora de lectura.
No se incorporaron dependencias ni una segunda implementación de cada listado.

## Verificación y límites

En Chromium integrado se revisaron las cinco secciones a 320, 360, 390, 430 y
768 px. En las 25 combinaciones el ancho del documento coincidió con el ancho
disponible y los controles no quedaron fuera de pantalla. Tras ajustar la
prioridad de los estilos se comprobó la fuente de 16 px en los campos de las cinco
secciones a 320 px. El modal se comprobó a 390 × 540, con alto de 520 px y scroll
interno, sin desbordamiento horizontal. Se revisa también la composición de escritorio.

La revisión visual usa los componentes reales con fixtures de
`src/test/visual/AdminMobileFixture.tsx` y `admin-fixtures.ts`. El navegador de
prueba no tenía sesión administrativa: las capturas muestran datos locales de
prueba, no transacciones de la barbería. No se cambió ninguna cuenta ni se
ejecutaron operaciones de escritura. Las pantallas con datos reales mantienen
su autorización normal. La página HTML utilizada para abrir esta revisión es
temporal y no forma parte de las rutas de la aplicación.

Para repetirla en desarrollo, crear un HTML temporal con `<div id="root"></div>`,
la etiqueta viewport habitual y un script de módulo que apunte a
`/src/test/visual/admin-mobile-entry.tsx`; abrirlo con Vite y retirarlo al terminar.
No importar esta entrada desde el router ni desde la entrada de producción.

Capturas: [Resumen](screenshots/admin-mobile-overview.png) y
[Caja](screenshots/admin-mobile-cash.png).

No se probaron un iPhone físico ni Safari ni el teclado real de un dispositivo.
La altura reducida comprueba la adaptación geométrica del modal, no sustituye
esa prueba física. Los checks de TypeScript, compilación, lint y la suite existente
acompañan la revisión visual.

Resultado de los controles: compilación, TypeScript y lint sin errores ni warnings.
La ejecución general pasó 108 de 109 pruebas; una prueba del modal agotó los 5 segundos
durante la carga simultánea del entorno. Se repitió su archivo aislado y pasaron las
6 pruebas, incluido el registro completo de una venta. No se amplió el timeout ni
se alteró esa prueba. El login real se revisó a 320 px, sin desbordamiento y con
ambos campos a 16 px.
