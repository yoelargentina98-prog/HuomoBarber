import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración central de Capacitor para Huomo.
 * El identificador com.huomo.barber es único y compartido entre Android e iOS.
 */
const config: CapacitorConfig = {
  appId: 'com.huomo.barber',
  appName: 'Huomo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0e1013',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#0e1013',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
