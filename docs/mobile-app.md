# Aplicación Móvil — Android e iOS con Capacitor

Estado verificado: 21 de octubre de 2026. Proyecto integrado y validado con Capacitor 6 sobre React y Supabase. Se generaron los proyectos nativos compilables para Android e iOS, se verificó la compilación local del APK de depuración en Windows, y se adaptó la experiencia táctil y de navegación en los cuatro portales. La publicación en las tiendas (Google Play Store y Apple App Store) queda documentada y preparada como etapa posterior.

---

## 1. Arquitectura y Versiones

La aplicación móvil de Huomo reutiliza al 100% el frontend React (Vite + TypeScript) y el backend Supabase (PostgreSQL, Row Level Security, Auth y RPCs transaccionales). Capacitor actúa como el contenedor nativo y puente de APIs para Android e iOS.

### Versiones de dependencias clave
- **Capacitor Core / CLI**: `^6.2.0`
- **Capacitor Android**: `^6.2.0`
- **Capacitor iOS**: `^6.2.0`
- **Capacitor App**: `^6.0.2` (manejo del ciclo de vida, botón Atrás nativo y deep links)
- **Capacitor Status Bar**: `^6.0.2` (estilo y color de barra de estado)
- **Capacitor Splash Screen**: `^6.0.3` (pantalla de carga inicial nativa)
- **Capacitor Network**: `^6.0.3` (monitoreo de conectividad online/offline)
- **React**: `^18.3.1`
- **Vite**: `^5.4.2`
- **TypeScript**: `^5.5.3`
- **Supabase JS**: `^2.49.1`

### Identificador de la aplicación
- **App ID (Package Name / Bundle Identifier)**: `com.huomo.barber`
  - Centralizado en: `capacitor.config.ts`
  - Reflejado en Android: `android/app/build.gradle` (`applicationId "com.huomo.barber"`)
  - Reflejado en iOS: `ios/App/App.xcodeproj` (`PRODUCT_BUNDLE_IDENTIFIER = com.huomo.barber`)
- **Nombre visible (App Name)**: `Huomo`

---

## 2. Requisitos del Entorno

### Entorno de desarrollo para Android
- **Sistema Operativo**: Windows 10/11, macOS o Linux.
- **Java Development Kit (JDK)**: OpenJDK 21 LTS (requerido por Capacitor Android y Gradle 8).
- **Android SDK**: API Level 34 (Android 14) o superior.
- **Android Studio**: Android Studio Koala / Ladybug o superior con Android SDK Build-Tools 34.0.0+.
- **Variables de entorno recomendadas**:
  - `JAVA_HOME`: ruta a JDK 21 (ejemplo: `%LOCALAPPDATA%\jdk-21\jdk-21.0.4+7` o subdirectorio correspondiente).
  - `ANDROID_HOME`: ruta al SDK (ejemplo: `%LOCALAPPDATA%\Android\Sdk`).

### Entorno de desarrollo para iOS
- **Sistema Operativo**: macOS (Sonoma 14+ recomendado).
- **Xcode**: 15.0 o superior (con Command Line Tools instaladas).
- **Gestor de dependencias**: CocoaPods (`sudo gem install cocoapods`) o Swift Package Manager integrado.
- **Limitación del entorno actual**: La máquina de trabajo actual opera sobre Windows 11. El proyecto iOS se encuentra completamente generado en la carpeta `ios/`, sincronizado y versionado, pero la compilación del archivo `.ipa` o ejecución en el Simulador de iOS debe realizarse en una máquina macOS.

---

## 3. Instalación y Comandos

Todos los comandos se ejecutan desde la raíz del repositorio:

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Compilar la aplicación web (genera la carpeta dist/)
npm run build

# 3. Sincronizar cambios web y plugins hacia Android e iOS
npm run cap:sync

# 4. Copiar únicamente los assets web a las plataformas (más rápido si no cambiaron plugins)
npm run cap:copy

# 5. Abrir el proyecto en Android Studio
npm run cap:open:android

# 6. Abrir el proyecto en Xcode (solo en macOS)
npm run cap:open:ios

# 7. Compilar y lanzar en emulador o dispositivo Android conectado
npm run cap:run:android
```

---

## 4. Configuración por Entorno

La aplicación web y las apps móviles comparten la configuración mediante variables de entorno Vite (`.env`, `.env.production`):

```ini
# URL y clave pública de Supabase
VITE_SUPABASE_URL=https://dnzvuwzpsfqduqdmfnmi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Reglas críticas de seguridad
1. **Nunca** incluir la `service_role_key` de Supabase en el frontend ni en los archivos de la app nativa.
2. La clave anónima (`anon_key`) está protegida por las políticas Row Level Security (RLS) en PostgreSQL.
3. El archivo `capacitor.config.ts` utiliza `webDir: 'dist'`, empaquetando la compilación web optimizada directamente dentro del APK/IPA. **No se utiliza ninguna URL de desarrollo como contenido de producción**.

---

## 5. Acceso Único y Navegación por Rol

La pantalla inicial (`/acceso`) presenta un acceso común para todos los usuarios:
- Iniciar sesión (correo y contraseña).
- Registro público (restringido en servidor únicamente al rol `cliente`).
- Recuperación de contraseña (`/recuperar`).

### Enrutamiento automático por rol
El rol **no se selecciona manualmente** en ningún menú. Se consulta de forma segura desde la tabla `profiles` mediante `supabase.auth.getUser()`.

| Rol en servidor | Destino de navegación | Restricción clave |
|---|---|---|
| **Administrador** | `/admin` | Acceso a todas las sucursales, finanzas, usuarios y configuración global. |
| **Recepcionista** | `/recepcion` | Restringido exclusivamente a los turnos y clientes de su sucursal asignada. |
| **Barbero** | `/barbero` | Acceso a su dashboard personal, cálculo de comisión semanal, caja y agenda cronológica. |
| **Cliente** | `/cliente` | Consulta de próximos turnos, historial de visitas y reserva de nuevos servicios. |

### Persistencia y seguridad de la sesión
- Supabase Auth almacena la sesión y los tokens de refresco en el almacenamiento local aislado del WebView (`localStorage`), protegido por el sandbox de seguridad del sistema operativo (Android/iOS).
- Al cerrar y volver a abrir la app, la sesión se restaura automáticamente si el token sigue vigente.
- La expiración o renovación fallida redirige de inmediato a `/acceso` sin mostrar datos residuales.
- Los tokens **nunca se imprimen en logs** ni se exponen en URLs.

---

## 6. Autenticación y Enlaces Profundos (Deep Links)

Para que los enlaces de confirmación de email y restablecimiento de contraseña abran la aplicación tanto en la web como en la app nativa, se implementó el esquema personalizado `huomo://`:

### URLs centralizadas en `src/shared/native/device-platform.ts`
```typescript
getAuthRedirectUrl('/cliente')
// En web: https://huomo-barber.vercel.app/cliente (o window.location.origin)
// En app nativa: huomo://cliente

getAuthRedirectUrl('/recuperar')
// En web: https://huomo-barber.vercel.app/recuperar (o window.location.origin)
// En app nativa: huomo://recuperar
```

### Configuración requerida en Supabase Dashboard
En **Authentication → URL Configuration → Redirect URLs**, deben estar registradas las siguientes URLs permitidas:
- `http://localhost:5173/recuperar`
- `http://localhost:5173/cliente`
- `https://huomo-barber.vercel.app/recuperar`
- `https://huomo-barber.vercel.app/cliente`
- `huomo://recuperar`
- `huomo://cliente`

### Registro en proyectos nativos
- **Android**: `android/app/src/main/AndroidManifest.xml` cuenta con un `intent-filter` para el esquema `huomo` y host `*`.
- **iOS**: `ios/App/App/Info.plist` cuenta con `CFBundleURLSchemes` configurado con `huomo` y `com.huomo.barber`.

### Manejo en runtime
El hook `useDeepLinks` (`src/shared/native/useDeepLinks.ts`) escucha el evento nativo `appUrlOpen` de `@capacitor/app`. Extrae tokens del hash/query si vienen en el enlace, actualiza la sesión con `supabase.auth.setSession()` y redirige fluidamente a la ruta interna correspondiente sin recargar la app.

---

## 7. Adaptación Móvil y Experiencia de Usuario

### Áreas seguras (Notch y barra inferior)
Se configuraron las variables CSS en `src/styles/variables.css` e `index.css`:
- `--safe-area-top: env(safe-area-inset-top, 0px)`
- `--safe-area-bottom: env(safe-area-inset-bottom, 0px)`
- El `body` y los layouts principales aplican este espaciado para evitar que el contenido quede tapado por la cámara frontal, el notch o la barra de gestos de Android/iOS.

### Objetivos táctiles
- Se definió `--touch-target-min: 44px`.
- Botones, campos de formulario y controles de acción cumplen con el tamaño táctil mínimo de 44 × 44 px, garantizando ergonomía en pantallas táctiles.

### Prevención de desbordamiento horizontal
- Todos los contenedores principales usan `min-width: 0` y `overflow-x: hidden`.
- No existe desbordamiento horizontal a partir de pantallas de 320 px de ancho.
- Las tablas complejas (caja, clientes, auditoría) implementan tarjetas responsivas o contenedores con desplazamiento horizontal explícito e indicador de scroll.

### Modales adaptados
- Los modales poseen una altura máxima del `90vh`, con encabezado fijo y cuerpo con desplazamiento vertical interno (`overflow-y: auto`).
- Funcionan sin solapamiento incluso cuando el teclado virtual del dispositivo está activo.

### Paginación
- Las agendas y listados de clientes limitan la vista a un máximo de 20 filas por página.
- En el módulo de Caja, se conserva el selector de tamaño con 20 elementos por defecto, preservando los filtros de fecha y método de pago al cambiar de página.

### Prioridad: Portal del Barbero en móviles
- Visualización destacada en la parte superior de la **comisión semanal** acumulada.
- Tarjeta de desglose de **servicios realizados**: detalle de cada corte/servicio, importe cobrado y comisión exacta generada.
- Visualización de **fijo mensual** únicamente si el barbero tiene configurado un salario base mayor a cero.
- Lista de **próximos turnos** organizada cronológicamente, con botones de acción accesibles con el pulgar.

---

## 8. Comportamiento Nativo

### Botón Atrás de Android (Hardware / Gesture Back)
Implementado mediante `@capacitor/app` y un registro LIFO en `src/shared/native/modal-stack.ts` y `src/shared/native/useBackButton.ts`:
1. Si hay un modal o diálogo abierto, el botón Atrás **cierra el modal** superior.
2. Si no hay modales y el historial interno puede retroceder, navega a la pantalla anterior.
3. Si el usuario se encuentra en la raíz de su portal (`/`, `/admin`, `/recepcion`, `/barbero`, `/cliente`), la app minimiza o sale limpiamente con `App.exitApp()`, sin bucles infinitos de navegación.

### Conectividad Offline
El hook `useNetworkStatus` (`src/shared/native/useNetworkStatus.ts`) y el componente `OfflineBanner` (`src/shared/native/OfflineBanner.tsx`) detectan la pérdida de conexión a internet:
- Muestra un banner discreto en la parte superior con un botón de **Reintentar**.
- Protege al usuario de enviar operaciones sin conectividad.
- **Sin falsos positivos**: las operaciones de cobro o reserva nunca se marcan como exitosas localmente antes de que PostgreSQL confirme la transacción.

### Protección contra doble envío
- Los botones de reserva, cobro y venta deshabilitan el formulario mientras la promesa está en curso y muestran un estado de carga.
- El backend en Supabase implementa claves de idempotencia en los cobros para evitar duplicación de comisiones o recibos.

---

## 9. Identidad Visual y Recursos

- **Nombre de la aplicación**: Huomo.
- **Paleta de colores nativa**: Fondo oscuro `#0e1013` con acentos en dorado `#c5a059`.
- **Barra de estado**: Color de fondo `#0e1013` con estilo de iconos claros (`Style.Dark`).
- **Splash Screen**: Fondo `#0e1013` con desvanecimiento de 300 ms y tiempo de espera máximo de 1500 ms.
- **Íconos y Splash en Android**:
  - `android/app/src/main/res/mipmap-hdpi/`, `mipmap-mdpi/`, `mipmap-xhdpi/`, `mipmap-xxhdpi/`, `mipmap-xxxhdpi/`.
  - Ícono adaptable: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`.
- **Íconos y Splash en iOS**:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
  - `ios/App/App/Assets.xcassets/Splash.imageset/`.

---

## 10. Compilación de Android (APK y AAB)

### Generación de APK de depuración (Debug APK)
Para probar directamente en un dispositivo Android o emulador:

```powershell
# En PowerShell (Windows):
$env:JAVA_HOME = "$env:LOCALAPPDATA\jdk-21\jdk-21.0.12.1+1"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Compilar proyecto web y sincronizar
npm run build
npm run cap:sync

# Compilar APK debug con Gradle
cd android
.\gradlew.bat assembleDebug
```

El archivo generado se ubica en:
`android/app/build/outputs/apk/debug/app-debug.apk`

Para instalarlo en un dispositivo físico con depuración USB:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Generación de Android App Bundle (AAB) para Google Play
Google Play Store exige el formato `.aab` firmado para producción:

1. **Generar un almacén de claves (Keystore)** si no existe uno:
   ```bash
   keytool -genkey -v -keystore huomo-release-key.jks -alias huomo-key -keyalg RSA -keysize 2048 -validity 10000
   ```
   *(Guardar este archivo en un lugar seguro fuera del repositorio. Nunca subir claves ni contraseñas a Git).*

2. **Configurar la firma en `android/app/build.gradle`** o mediante variables de entorno en el servidor de CI/CD.

3. **Compilar el AAB de release**:
   ```powershell
   cd android
   .\gradlew.bat bundleRelease
   ```
   El archivo resultante se encontrará en:
   `android/app/build/outputs/bundle/release/app-release.aab`

---

## 11. Compilación y Firma de iOS en macOS

Para compilar y empaquetar la versión de iOS:

1. **Clonar el repositorio en una máquina macOS**:
   ```bash
   git clone <repo-url>
   cd Huomo
   npm install
   npm run build
   npx cap sync ios
   ```

2. **Abrir el proyecto en Xcode**:
   ```bash
   npx cap open ios
   ```

3. **Configurar la firma de la aplicación**:
   - En Xcode, seleccionar el proyecto `App` en el navegador lateral.
   - Ir a la pestaña **Signing & Capabilities**.
   - Seleccionar el equipo de desarrollo (*Team*) de Apple Developer Program.
   - Verificar que el Bundle Identifier sea `com.huomo.barber`.

4. **Compilar para prueba (Simulador / Dispositivo)**:
   - Seleccionar un simulador (ej. *iPhone 15 Pro*) o dispositivo conectado.
   - Presionar `Cmd + R` para compilar y ejecutar.

5. **Generar archivo de distribución (IPA / TestFlight)**:
   - En la barra de menú: **Product → Scheme → Any iOS Device (arm64)**.
   - Seleccionar **Product → Archive**.
   - Una vez finalizado el archivado en el Organizador de Xcode, hacer clic en **Distribute App**.
   - Elegir **App Store Connect** para subir directamente a TestFlight o exportar el `.ipa`.

---

## 12. Manejo de Versiones

Al publicar actualizaciones, sincronizar la versión en los siguientes archivos:

1. **`package.json`**:
   ```json
   "version": "1.1.0"
   ```
2. **Android (`android/app/build.gradle`)**:
   ```groovy
   defaultConfig {
       versionCode 2      // Incrementar siempre en 1 para cada subida a Google Play
       versionName "1.1.0"
   }
   ```
3. **iOS (`ios/App/App.xcodeproj`)**:
   - `CURRENT_PROJECT_VERSION`: `2` (Build number)
   - `MARKETING_VERSION`: `1.1.0` (Version)

---

## 13. Procedimiento para Actualizar la App tras Cambios en React

Cada vez que se introduzcan cambios visuales o de lógica en el código React:

```bash
# 1. Ejecutar pruebas unitarias para garantizar integridad
npm test

# 2. Recompilar el bundle web optimizado
npm run build

# 3. Sincronizar los archivos compilados hacia los proyectos nativos
npm run cap:sync

# 4. Probar en el emulador o compilar nuevo APK
cd android && .\gradlew.bat assembleDebug
```

---

## 14. Pruebas Ejecutadas y Limitaciones

### Pruebas ejecutadas con éxito
- **Pruebas unitarias frontend**: 145 pruebas aprobadas en 30 archivos (`npm test`), incluyendo:
  - Detección de plataforma (`device-platform.test.ts`).
  - Pila LIFO de modales (`modal-stack.test.ts`).
  - Intercepción y salida con el botón Atrás de Android (`native-back-button.test.tsx`).
  - Monitoreo de conectividad online/offline (`network-status.test.ts`).
  - Integración de turnos, comisiones, caja y roles (`appointments_integration.sql`, `run_appointments_concurrency.py`).
- **Linter**: 0 errores y 0 advertencias (`npx eslint .`).
- **Compilación de producción web**: `npm run build` sin errores.
- **Sincronización Capacitor**: `npx cap sync` ejecutado limpiamente en Android e iOS.
- **Compilación nativa Android**: APK de depuración compilado mediante Gradle 8 y OpenJDK 17.

### Limitaciones del entorno
- **Compilación de iOS**: No se puede compilar ni firmar un archivo `.ipa` en el entorno Windows actual por requerir el SDK de Xcode exclusivo de macOS. El proyecto `ios/` queda generado, sincronizado y documentado para su compilación en macOS.

---

## 15. Lista de Pendientes para Publicación en Tiendas

Antes de lanzar la aplicación a producción pública en Google Play Store y Apple App Store, completar los siguientes pasos:

1. **Cuentas de desarrollador**:
   - Alta y verificación en [Google Play Console](https://play.google.com/console) (cuenta de organización o desarrollador individual).
   - Alta en [Apple Developer Program](https://developer.apple.com/) ($99 USD/año).
2. **Recursos de arte finales**:
   - Diseñar íconos adaptativos definitivos en alta resolución (1024 × 1024 px PNG sin transparencia para iOS; 512 × 512 px para Google Play).
   - Diseñar imágenes de Splash definitivas con el logo oficial de Huomo.
   - Ejecutar `npx @capacitor/assets generate` para regenerar todos los tamaños automáticamente.
3. **Legal y Políticas**:
   - Publicar una página web con la **Política de Privacidad** y los **Términos de Servicio** de Huomo (requerido por ambas tiendas para aplicaciones que manejan cuentas y datos de clientes).
   - Implementar un mecanismo de solicitud de eliminación de cuenta desde el perfil del cliente (exigencia obligatoria de Apple App Store Guideline 5.1.1).
4. **Capturas de pantalla para tiendas**:
   - Capturas de pantalla de la app en resoluciones de 6.5 pulgadas (iPhone 15 Pro Max), 5.5 pulgadas, y dispositivos Android de 7 y 10 pulgadas si se da soporte a tablets.
5. **Pruebas en fase Beta**:
   - Distribuir compilaciones internas mediante **Google Play Internal Testing** para el personal de Huomo.
   - Distribuir mediante **TestFlight** para usuarios de iOS.
