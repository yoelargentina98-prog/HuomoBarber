import { useNativeApp } from './useNativeApp';
import { OfflineBanner } from './OfflineBanner';

/**
 * Componente puente que activa las capacidades nativas de Capacitor
 * y renderiza el indicador de conexión para la aplicación.
 */
export function NativeBridge() {
  useNativeApp();
  return <OfflineBanner />;
}
