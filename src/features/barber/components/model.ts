export const barberSections = {
  overview: { label: 'Mi resumen', icon: 'dashboard' },
  earnings: { label: 'Mi caja', icon: 'wallet' },
  services: { label: 'Mis servicios', icon: 'scissors' },
  history: { label: 'Mi historial', icon: 'clock' },
  agenda: { label: 'Mi agenda', icon: 'calendar' },
} as const;
export type BarberSection = keyof typeof barberSections;
export type BarberProfile = {
  id: string;
  name: string;
  username: string;
  branchName: string | null;
};
