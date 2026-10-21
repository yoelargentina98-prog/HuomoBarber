# Registro de Decisiones Técnicas (ADR) — Huomo

Este documento recopila las decisiones arquitectónicas y técnicas más relevantes adoptadas durante la concepción y desarrollo del proyecto, junto con sus fundamentos y consecuencias.

---

## ADR 001: Adopción de React con Vite y TypeScript en Modo Estricto

- **Contexto**: Se requería una base ágil, moderna y fuertemente tipada para un sistema de gestión con múltiples portales y roles diferenciados.
- **Decisión**: Utilizar Vite con React y TypeScript en modo estricto (`"strict": true`, `"noImplicitAny": true`, etc.).
- **Motivo**: Vite provee tiempos de arranque casi instantáneos y reemplazo de módulos en caliente (HMR) extremadamente rápido. TypeScript estricto garantiza que los errores de contrato entre capas se detecten en tiempo de compilación y no en ejecución.
- **Consecuencias**: Mayor disciplina en el tipado de componentes y props; imposibilidad de usar `any`.

---

## ADR 002: Separación de Portales por Layouts y Rutas Declarativas

- **Contexto**: El sistema debe dar soporte a Administradores, Recepcionistas, Barberos y Clientes que realizan reservas públicas.
- **Decisión**: Crear layouts específicos para cada portal (`AdminLayout`, `ReceptionLayout`, `BarberLayout`, `PublicLayout`) montados sobre un `RootLayout` común que expone el estado de configuración.
- **Motivo**: Cada portal tiene necesidades ergonómicas y funcionales distintas (ej. el barbero opera prioritariamente en tablets/móviles al lado de su sillón, la recepción en escritorio con vista amplia).
- **Consecuencias**: Facilita agregar navegación contextual, barras laterales y protecciones de acceso por rol en futuros sprints sin contaminar el resto de los portales.

---

## ADR 003: No Simulación de Seguridad en localStorage en Sprint 0

- **Contexto**: En fases tempranas es común que se simule autenticación guardando `{ role: 'admin' }` en `localStorage` o cookies manipulables.
- **Decisión**: Rechazar enfáticamente cualquier simulación de roles en almacenamiento local. Dejar las rutas accesibles para revisión visual, pero acompañadas de un aviso explícito de que no constituyen protección de acceso.
- **Motivo**: Simular autenticación falsa crea una sensación ilusoria de seguridad, genera código muerto que luego debe ser removido y puede derivar en malas prácticas de autorización. La seguridad real se basará en tokens criptográficos validados por Supabase Auth y RLS.
- **Consecuencias**: Las pantallas iniciales son navegables libremente en Sprint 0, lo cual facilita la inspección técnica y de diseño sin fricciones artificiales.

---

## ADR 004: Tolerancia a Variables de Entorno Faltantes al Iniciar

- **Contexto**: Un desarrollador o evaluador nuevo puede clonar el repositorio sin contar aún con un proyecto de Supabase activo.
- **Decisión**: El validador de entorno y el cliente de Supabase no lanzan excepciones no controladas durante la carga inicial de la aplicación. En su lugar, reportan el estado mediante un indicador visual en el encabezado y en el Hub.
- **Motivo**: Permite inspeccionar la interfaz de usuario, los layouts y ejecutar pruebas de enrutamiento sin requerir credenciales externas en el primer contacto con el proyecto. Solo las operaciones que exijan conexión obligatoria invocarán `requireSupabaseClient()`.
- **Consecuencias**: Experiencia de desarrollo amigable y sin bloqueos innecesarios.

---

## ADR 005: Estilizado con CSS Nativo y Tokens de Diseño

- **Contexto**: Se necesitaba un diseño visual sofisticado y exclusivo para la marca "Huomo" (estilo caballero oscuro, detalles dorados/ámbar, tipografía refinada).
- **Decisión**: Utilizar CSS nativo con variables personalizadas (`src/styles/variables.css` y `src/styles/index.css`), evitando librerías de componentes pesadas o dependencias de utilidades innecesarias.
- **Motivo**: Proporciona control milimétrico sobre la estética, cero overhead en el bundle final, compatibilidad total con cualquier framework futuro y facilidad para ajustar temas oscuros y accesibilidad.
- **Consecuencias**: No se depende de frameworks CSS de terceros; el equipo mantiene el control total de la hoja de estilos.

---

## ADR 006: Uso de Vitest y Testing Library para Pruebas Rápidas

- **Contexto**: Se requerían pruebas mínimas pero de alto valor para validar el enrutamiento de los portales, la detección de 404 y la validación de variables de entorno.
- **Decisión**: Emplear Vitest con `@testing-library/react` y `@testing-library/jest-dom/vitest`.
- **Motivo**: Vitest comparte la misma configuración y pipeline de transformación de Vite, ejecutándose de forma nativa a máxima velocidad sin necesidad de configurar compiladores duplicados como Babel.
- **Consecuencias**: Pruebas rápidas y consistentes con la compilación de producción.

# Decisión: creación de empleados desde servidor

Las cuentas de empleados se crean mediante `create-staff`, una Edge Function que
verifica la sesión y el rol admin antes de usar la API administrativa de Auth.
Los empleados usan identificadores internos, sin correo real. Se agregó acceso
mínimo del administrador al módulo de personal; no registro público ni login
general de empleados. Ver [detalle y despliegue](staff-management.md).
