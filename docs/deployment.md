# Despliegue en Vercel — Huomo

Este documento describe la preparación y configuración del proyecto para su despliegue continuo en [Vercel](https://vercel.com), la gestión de variables de entorno y la resolución de rutas en aplicaciones Single Page Application (SPA).

---

## 1. Configuración de Rutas SPA (`vercel.json`)

En aplicaciones SPA gestionadas mediante React Router del lado del cliente, cuando un usuario accede directamente o recarga una ruta como `/admin` o `/reservar`, el servidor web intentará buscar un archivo físico `/admin/index.html` o similar. Si el servidor no está configurado, responderá con un error HTTP 404.

Para solucionar esto, el proyecto incluye [`vercel.json`](../vercel.json) en la raíz:

```json
{
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Cómo funciona:

- Cualquier solicitud entrante que no coincida con un archivo estático existente en `dist/` es reescrita internamente hacia `/index.html`.
- El navegador descarga el bundle de React y React Router evalúa la URL actual (`window.location.pathname`), renderizando el portal o la página correspondiente sin recargas ni errores de servidor.

---

## 2. Configuración del Proyecto en el Panel de Vercel

1. **Importar Repositorio**:
   - Conecte su cuenta de GitHub / GitLab / Bitbucket e importe el repositorio `Huomo`.
2. **Framework Preset**:
   - Seleccionar **Vite**.
3. **Build and Output Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables**:
   Configure en el panel de Vercel las mismas variables definidas en `.env.example`:
   - `VITE_SUPABASE_URL`: `https://tu-proyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `tu-clave-anonima-publica`
   - _Nota_: Asegúrese de asociar las variables a los entornos de **Production**, **Preview** y **Development**.

---

## 3. Comprobación Previa al Despliegue

Antes de realizar `git push` o disparar una compilación en Vercel, ejecute localmente la suite de verificación obligatoria:

```bash
# 1. Comprobación de estilos y formato
npm run format

# 2. Análisis estático de código
npm run lint

# 3. Comprobación estricta de tipos
npm run typecheck

# 4. Ejecución de pruebas
npm run test

# 5. Compilación de producción
npm run build
```

Si todos los comandos finalizan con código de salida `0`, el código está listo para ser desplegado sin riesgo de roturas en el pipeline de CI/CD.
