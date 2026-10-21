import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isNativePlatform } from './device-platform';
import { requireSupabaseClient } from '../../integrations/supabase/client';

/**
 * Hook para procesar Deep Links entrantes (huomo://... o enlaces universales)
 * con tokens de autenticación de Supabase (recuperación de contraseña, confirmación).
 */
export function useDeepLinks(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    async function register() {
      try {
        const handle = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
          const urlStr = event.url;
          if (!urlStr) return;

          try {
            // El formato puede ser huomo://recuperar#access_token=... o huomo://cliente
            // Reemplazamos el protocolo personalizado por https:// para usar el parser estándar URL
            const normalizedUrl = urlStr.startsWith('huomo://')
              ? urlStr.replace('huomo://', 'https://app.huomo.barber/')
              : urlStr.startsWith('com.huomo.barber://')
              ? urlStr.replace('com.huomo.barber://', 'https://app.huomo.barber/')
              : urlStr;

            const parsed = new URL(normalizedUrl);
            const path = parsed.pathname; // ej: '/recuperar' o '/cliente'
            const hash = parsed.hash.replace(/^#/, '');
            const search = parsed.search;

            // Extraer parámetros de hash o search
            const params = new URLSearchParams(hash || search);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const code = params.get('code');
            const error = params.get('error_description') || params.get('error');

            const supabase = requireSupabaseClient();

            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            } else if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }

            if (path.includes('recuperar')) {
              navigate('/recuperar', { replace: true, state: { error } });
            } else if (path.includes('cliente')) {
              navigate('/cliente', { replace: true });
            } else if (path && path !== '/') {
              navigate(path, { replace: true });
            }
          } catch {
            /* prevenir caídas si la URL viene malformada */
          }
        });

        cleanup = () => {
          void handle.remove();
        };
      } catch {
        /* No soportado en este entorno */
      }
    }

    void register();

    return () => {
      if (cleanup) cleanup();
    };
  }, [navigate]);
}
