import { Capacitor } from '@capacitor/core';

export type SupportedPlatform = 'android' | 'ios' | 'web';

/**
 * Devuelve si la aplicación se está ejecutando dentro de un contenedor nativo (Capacitor).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Devuelve la plataforma en ejecución ('android', 'ios' o 'web').
 */
export function getPlatform(): SupportedPlatform {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      return platform;
    }
  } catch {
    /* fallback a web */
  }
  return 'web';
}

/**
 * Centraliza la selección de URL de retorno para autenticación (confirmación de correo, recuperación).
 * En la app nativa utiliza el esquema de deep linking 'huomo://'.
 * En web utiliza el origen actual (window.location.origin).
 */
export function getAuthRedirectUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (isNativePlatform()) {
    // Esquema registrado en AndroidManifest.xml y Info.plist
    const schemePath = cleanPath.replace(/^\//, '');
    return `huomo://${schemePath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${cleanPath}`;
  }

  return cleanPath;
}
