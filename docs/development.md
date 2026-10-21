# Guía de Desarrollo y Convenciones — Huomo

Esta guía establece las convenciones de código, la ubicación de archivos, las reglas de calidad obligatorias y el procedimiento paso a paso para añadir nuevas funcionalidades en el proyecto.

---

## 1. Criterios de Calidad Obligatorios

1. **Tipado Estricto (Prohibido `any`)**:
   - Todo archivo TypeScript debe compilar sin errores en modo estricto.
   - Está terminantemente prohibido utilizar `any` para silenciar advertencias del compilador. Si una estructura de datos es dinámica o desconocida, use tipos genéricos, uniones discriminadas o `unknown` con type guards.
2. **Límite de Tamaño de Archivo**:
   - Los archivos de código deben mantenerse por debajo de **250 líneas**.
   - Si un archivo se acerca a 300 líneas, debe revisarse su cohesión y dividirse en subcomponentes, custom hooks o utilidades específicas.
3. **Manejo Explícito de Errores**:
   - Evitar bloques `catch` vacíos. Todo error debe ser tipado o transformado a un mensaje comprensible para el usuario o desarrollador.
4. **Accesibilidad (a11y) y HTML Semántico**:
   - Usar elementos HTML semánticos (`<header>`, `<main>`, `<nav>`, `<article>`, `<section>`, `<aside>`).
   - Todo elemento interactivo debe ser accesible por teclado con estados de foco visibles (`:focus-visible`).
   - Las alertas dinámicas deben contar con atributos ARIA pertinentes (`role="alert"` o `role="status"`).
5. **No Optimización Prematura**:
   - No utilizar `useMemo` ni `useCallback` de forma indiscriminada. Solo aplicarlos ante cálculos costosos evidentes o referencias estables exigidas por dependencias de efectos.

---

## 2. Convenciones de Código y Nombrado

- **Componentes React**: PascalCase en archivos `.tsx` (`AdminLayout.tsx`, `Button.tsx`).
- **Hooks**: camelCase con prefijo `use` (`useSupabaseStatus.ts`).
- **Utilidades y librerías**: camelCase en archivos `.ts` (`env.ts`, `formatCurrency.ts`).
- **Archivos de prueba**: sufijo `.test.ts` o `.test.tsx` dentro de `src/test/` o adyacentes al módulo.
- **Constantes globales**: SCREAMING_SNAKE_CASE (`APP_ROUTES`, `USER_ROLES`).
- **Estilos**: Variables CSS nativas en `src/styles/variables.css` con prefijo `--color-`, `--space-`, `--font-`.

---

## 3. ¿Dónde ubicar cada tipo de código?

| Tipo de Código                                  | Ubicación Correcta                   | Ejemplo                   |
| :---------------------------------------------- | :----------------------------------- | :------------------------ |
| Pantallas completas de un portal                | `src/features/<dominio>/pages/`      | `AdminHomePage.tsx`       |
| Componentes específicos de una función          | `src/features/<dominio>/components/` | `BarberQueueCard.tsx`     |
| Custom hooks específicos de una función         | `src/features/<dominio>/hooks/`      | `useBarberQueue.ts`       |
| Componentes visuales genéricos y reutilizables  | `src/shared/components/`             | `Button.tsx`, `Alert.tsx` |
| Utilidades transversales sin dependencias de UI | `src/shared/lib/`                    | `env.ts`                  |
| Tipos globales compartidos                      | `src/shared/types/`                  | `roles.ts`                |
| Clientes de terceros y SDKs externos            | `src/integrations/<servicio>/`       | `supabase/client.ts`      |
| Estructuras de layout y shells                  | `src/app/layouts/`                   | `AdminLayout.tsx`         |
| Definición de rutas                             | `src/app/router/`                    | `routes.ts`, `index.tsx`  |

---

## 4. Guía Paso a Paso: Cómo Agregar una Nueva Funcionalidad

Tomando como ejemplo la creación del módulo de _Catálogo de Servicios_:

1. **Definir los Tipos de Datos**:
   - Crear `src/features/services/types.ts` con la interfaz de la entidad (ej: `ServiceItem`).
2. **Implementar el Servicio / Repositorio**:
   - Crear `src/features/services/services/servicesRepository.ts`.
   - Utilizar `getSupabaseClient()` para consultar la tabla correspondiente mediante tipado estricto.
3. **Crear el Custom Hook**:
   - Crear `src/features/services/hooks/useServicesList.ts` para encapsular la carga de datos, estados de carga (`isLoading`), y manejo de errores.
4. **Construir los Componentes Visuales**:
   - Crear componentes puros en `src/features/services/components/` que reciban props y utilicen los tokens de diseño de `src/styles/variables.css`.
5. **Ensamblar la Página**:
   - Conectar el hook con los componentes visuales en `src/features/services/pages/ServicesManagerPage.tsx`.
6. **Integrar en el Enrutador**:
   - Añadir la ruta en `src/app/router/routes.ts` y montarla en `src/app/router/index.tsx`.
7. **Escribir Pruebas**:
   - Crear `src/test/services.test.tsx` con pruebas de renderizado y estados de error.
8. **Verificar Calidad**:
   ```bash
   npm run lint
   npm run typecheck
   npm run format
   npm run test
   npm run build
   ```
