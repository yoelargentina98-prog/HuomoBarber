import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routesConfig } from '../app/router';
import { hasAdminSession } from '../features/staff/services/admin-session';
import { listStaff } from '../features/staff/services/staff-service';

vi.mock('../features/staff/services/admin-session', () => ({
  hasAdminSession: vi.fn(),
  onSessionChange: () => () => {},
  signOutAdmin: vi.fn(),
  signInAdmin: vi.fn(),
}));
vi.mock('../features/staff/services/staff-service', () => ({
  listStaff: vi.fn(),
  loadStaffCounts: async () => ({ barber: 0, reception: 0 }),
}));
function renderRoute(path: string) {
  return render(
    <RouterProvider router={createMemoryRouter(routesConfig, { initialEntries: [path] })} />
  );
}
describe('Separación del sitio público y administración', () => {
  beforeEach(() => {
    vi.mocked(hasAdminSession).mockResolvedValue(false);
    vi.mocked(listStaff).mockResolvedValue([]);
  });
  it('presenta la pantalla de bienvenida con acceso unificado sin selector de rol', () => {
    renderRoute('/');
    expect(screen.getByRole('tab', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar al sistema/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario o email/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /rol/i })).not.toBeInTheDocument();
  });
  it.each([
    '/admin',
    '/admin/personal',
    '/admin/caja',
    '/sucursal/a7cd4e05-8a5f-4a5b-a232-4b490798cd6d',
  ])('exige ingreso privado entrando directamente a %s', async path => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar al sistema/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear empleado' })).not.toBeInTheDocument();
  });
  it('renderiza el dashboard para un administrador', async () => {
    vi.mocked(hasAdminSession).mockResolvedValue(true);
    renderRoute('/admin');
    expect(await screen.findByRole('heading', { name: 'Resumen del negocio' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument();
    expect(screen.queryByText(/Ruta técnica/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recepción' })).not.toBeInTheDocument();
  });
  it('un error de personal no devuelve al administrador al login', async () => {
    vi.mocked(hasAdminSession).mockResolvedValue(true);
    vi.mocked(listStaff).mockRejectedValue(new Error('Error de conexión de prueba'));
    renderRoute('/admin/personal');
    expect(await screen.findByText('No pudimos cargar el equipo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo empleado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ingresar al sistema/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
  it('mantiene las reservas públicas sin enlaces administrativos', () => {
    renderRoute('/reservar');
    expect(screen.getByRole('heading', { name: 'Portal Público de Reservas' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administrador' })).not.toBeInTheDocument();
  });
  it('protege el acceso directo de barbero sin menú público de roles', async () => {
    renderRoute('/barbero');
    expect(await screen.findByRole('button', { name: /Ingresar al sistema/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /portales/i })).not.toBeInTheDocument();
  });
  it('muestra 404 para una ruta desconocida', () => {
    renderRoute('/no-existe');
    expect(screen.getByRole('heading', { name: /Página no encontrada/ })).toBeInTheDocument();
  });
});
