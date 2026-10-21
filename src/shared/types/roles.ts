/**
 * Definición centralizada de roles de usuario y portales de Huomo.
 *
 * NOTA DE SEGURIDAD (Sprint 0):
 * Estos tipos y constantes representan las identidades del modelo de negocio,
 * pero NO constituyen control de acceso ni autenticación real.
 * En Sprint 0 no existe persistencia ni simulación de roles en localStorage.
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  RECEPTION: 'reception',
  BARBER: 'barber',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface RoleMetadata {
  id: UserRole;
  title: string;
  description: string;
  isInternal: boolean;
  defaultPath: string;
}

export const ROLES_METADATA: Record<UserRole, RoleMetadata> = {
  [USER_ROLES.ADMIN]: {
    id: USER_ROLES.ADMIN,
    title: 'Administrador',
    description: 'Gestión global de la barbería, configuración, equipo y auditoría.',
    isInternal: true,
    defaultPath: '/admin',
  },
  [USER_ROLES.RECEPTION]: {
    id: USER_ROLES.RECEPTION,
    title: 'Recepcionista',
    description: 'Atención en mostrador, asignación de turnos y cobro de caja.',
    isInternal: true,
    defaultPath: '/recepcion',
  },
  [USER_ROLES.BARBER]: {
    id: USER_ROLES.BARBER,
    title: 'Barbero',
    description: 'Vista de turnos del día, estado de servicios y registro técnico.',
    isInternal: true,
    defaultPath: '/barbero',
  },
};

export const PUBLIC_PORTAL = {
  id: 'public_booking',
  title: 'Portal Público de Clientes',
  description: 'Canal abierto para reservas y catálogo de servicios de clientes finales.',
  isInternal: false,
  path: '/reservar',
} as const;
