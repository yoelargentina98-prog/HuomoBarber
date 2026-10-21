/** Entradas públicas y privadas. No usar roles como navegación del sitio público. */
export const APP_ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  ADMIN_STAFF: '/admin/personal',
  ADMIN_SERVICES: '/admin/servicios',
  ADMIN_BRANCHES: '/admin/sucursales',
  ADMIN_CASH: '/admin/caja',
  RECEPTION: '/recepcion',
  BARBER: '/barbero',
  BOOKING: '/reservar',
  NOT_FOUND: '/404',
} as const;
export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
