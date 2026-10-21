import React from 'react';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Proveedor raíz para composición de contextos y servicios globales.
 * En Sprint 0 ofrece el contenedor composable para futuros proveedores
 * (Autenticación, Notificaciones, QueryClient, etc.).
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return <>{children}</>;
};
