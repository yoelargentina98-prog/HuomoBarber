import { useEffect, useState, useCallback } from 'react';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { isNativePlatform } from './device-platform';

export type NetworkState = {
  isOnline: boolean;
  connectionType: string;
  checkConnection: () => Promise<boolean>;
};

export function useNetworkStatus(): NetworkState {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      if (isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
        return status.connected;
      }
    } catch {
      /* fallback a navegador */
    }

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(online);
    return online;
  }, []);

  useEffect(() => {
    let active = true;

    if (isNativePlatform()) {
      let cleanupNetwork: (() => void) | null = null;
      void Network.getStatus().then(status => {
        if (active) {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        }
      });

      void Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        if (active) {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        }
      }).then(handle => {
        cleanupNetwork = () => {
          void handle.remove();
        };
      });

      return () => {
        active = false;
        if (cleanupNetwork) cleanupNetwork();
      };
    }

    // Web fallback
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return { isOnline, connectionType, checkConnection };
}
