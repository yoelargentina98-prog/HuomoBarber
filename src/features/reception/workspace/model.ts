export const receptionSections = {
  overview: { label: 'Resumen', icon: 'dashboard' },
  cash: { label: 'Caja y ventas', icon: 'wallet' },
  team: { label: 'Equipo de la sucursal', icon: 'team' },
  agenda: { label: 'Agenda', icon: 'calendar' },
} as const;
export type ReceptionSection = keyof typeof receptionSections;
