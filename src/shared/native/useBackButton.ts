import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isNativePlatform } from './device-platform';
import { modalStack } from './modal-stack';

/**
 * Hook para gestionar el botón Atrás nativo de Android.
 * Prioridad:
 * 1. Cierra el modal o diálogo activo más reciente.
 * 2. Si no hay modales y la ruta no es la raíz, navega hacia atrás.
 * 3. Si está en la pantalla principal o de bienvenida, minimiza/sale de la app sin bucles.
 */
export function useBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    async function register() {
      try {
        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          // 1. Cerrar primero cualquier modal abierto
          if (modalStack.popAndClose()) {
            return;
          }

          // 2. Comprobar si estamos en una pantalla raíz donde no queremos bucle
          const rootPaths = ['/', '/admin', '/recepcion', '/barbero', '/cliente'];
          const isAtRoot = rootPaths.includes(location.pathname);

          if (isAtRoot || !canGoBack) {
            // Salir limpiamente de la app
            void App.exitApp();
          } else {
            // Retroceder dentro del historial de rutas
            navigate(-1);
          }
        });

        cleanup = () => {
          void handle.remove();
        };
      } catch {
        /* Ignorar si no está soportado */
      }
    }

    void register();

    return () => {
      if (cleanup) cleanup();
    };
  }, [location.pathname, navigate]);
}
