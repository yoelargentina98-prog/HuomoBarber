import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App, type AppState } from '@capacitor/app';
import { isNativePlatform } from './device-platform';
import { useBackButton } from './useBackButton';
import { useDeepLinks } from './useDeepLinks';
import { requireSupabaseClient } from '../../integrations/supabase/client';

/**
 * Hook maestro que inicializa los servicios nativos de Capacitor:
 * - Botón Atrás físico/gestual (cierre de modales y retroceso de rutas).
 * - Enlaces profundos de autenticación (recuperación de contraseña / confirmación).
 * - Estilo y color de barra de estado en modo oscuro (#0e1013).
 * - Ocultamiento suave de la pantalla de bienvenida nativa (SplashScreen).
 * - Detección de retorno desde segundo plano para revalidar la sesión.
 */
export function useNativeApp(): void {
  useBackButton();
  useDeepLinks();

  useEffect(() => {
    if (!isNativePlatform()) return;

    async function initNative() {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0e1013' });
      } catch {
        /* StatusBar no disponible en la plataforma */
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        /* SplashScreen no disponible */
      }
    }

    void initNative();

    // Revalidación al volver de segundo plano
    let cleanupAppState: (() => void) | null = null;
    void App.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) {
        // Al regresar al primer plano, forzar refresco de token si expiró
        try {
          void requireSupabaseClient().auth.getSession();
        } catch {
          /* cliente no listo */
        }
      }
    }).then(handle => {
      cleanupAppState = () => {
        void handle.remove();
      };
    });

    return () => {
      if (cleanupAppState) cleanupAppState();
    };
  }, []);
}
