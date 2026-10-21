import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativePlatform } from './device-platform';
import { acceptNativeAuthUrl } from '../../features/auth/services/native-auth-callback';

// NativeBridge mounts again when entering another portal; never consume a code twice.
let lastConsumedUrl = '';

/** Handle both running-app and cold-start callbacks, with one listener per mount. */
export function useDeepLinks(): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativePlatform()) return;
    let active = true;
    let handle: PluginListenerHandle | undefined;
    async function receive(url: string) {
      if (!active || url === lastConsumedUrl) return;
      lastConsumedUrl = url;
      try {
        const route = await acceptNativeAuthUrl(url);
        if (!route || !active) return;
        const { Browser } = await import('@capacitor/browser');
        await Browser.close().catch(() => undefined);
        if (active) navigate(route, { replace: true });
      } catch (cause) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close().catch(() => undefined);
        if (active)
          navigate('/', {
            replace: true,
            state: {
              authError: cause instanceof Error ? cause.message : 'No se pudo completar el acceso.',
            },
          });
      }
    }
    async function register() {
      handle = await App.addListener('appUrlOpen', event => {
        void receive(event.url);
      });
      if (!active) {
        await handle.remove();
        return;
      }
      const launch = await App.getLaunchUrl();
      if (launch?.url) await receive(launch.url);
    }
    void register().catch(() => {
      if (active)
        navigate('/', {
          replace: true,
          state: { authError: 'No se pudo preparar el acceso móvil. Cerrá y volvé a abrir Huomo.' },
        });
    });
    return () => {
      active = false;
      void handle?.remove();
    };
  }, [navigate]);
}
