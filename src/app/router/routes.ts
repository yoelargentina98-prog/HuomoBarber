/** Entradas públicas y privadas. */
export const APP_ROUTES = {
  HOME: '/',
  ADMIN: '/admin',
  ADMIN_STAFF: '/admin/personal',
  ADMIN_SERVICES: '/admin/servicios',
  ADMIN_BRANCHES: '/admin/sucursales',
  ADMIN_CASH: '/admin/caja',
  ADMIN_APPOINTMENTS: '/admin/turnos',
  RECEPTION: '/recepcion',
  BARBER: '/barbero',
  BOOKING: '/reservar',
  CLIENT: '/cliente',
  CLIENT_BOOKING: '/cliente/reservar',
  CLIENT_APPOINTMENTS: '/cliente/turnos',
  CLIENT_BRANCHES: '/cliente/sucursales',
  CLIENT_PROFILE: '/cliente/perfil',
  NOT_FOUND: '/404',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
