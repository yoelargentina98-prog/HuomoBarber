import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminLayout } from '../app/layouts/AdminLayout';
import { BarberLayout } from '../app/layouts/BarberLayout';
import { ReceptionLayout } from '../app/layouts/ReceptionLayout';
const mocks = vi.hoisted(() => ({ guest: false, logout: vi.fn(), session: vi.fn(), rpc: vi.fn() }));
vi.mock('../features/admin/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ status: mocks.guest ? 'guest' : 'admin', retry: vi.fn() }),
}));
vi.mock('../features/reception/useReceptionAccess', () => ({
  useReceptionAccess: () => ({
    loading: false,
    operator: mocks.guest ? null : { role: 'reception', branchId: 'branch' },
    retry: vi.fn(),
  }),
}));
vi.mock('../features/staff/services/admin-session', () => ({
  signOutAdmin: mocks.logout,
  onSessionChange: () => () => {},
}));
vi.mock('../integrations/supabase/client', () => ({
  requireSupabaseClient: () => ({ auth: { getSession: mocks.session }, rpc: mocks.rpc }),
}));
vi.mock('../features/staff/components/StaffProvider', () => ({
  StaffProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../shared/native/NativeBridge', () => ({ NativeBridge: () => null }));
vi.mock('../features/admin/components/AdminShell', () => ({
  AdminShell: ({ onLogout, logoutError }: { onLogout: () => void; logoutError: string }) => (
    <>
      <button onClick={onLogout}>Cerrar sesión</button>
      {logoutError && <p role="alert">{logoutError}</p>}
    </>
  ),
}));
vi.mock('../features/barber/components/BarberShell', () => ({
  BarberShell: ({ onLogout }: { onLogout: () => void }) => (
    <button onClick={onLogout}>Cerrar sesión</button>
  ),
}));
vi.mock('../features/barber/dashboard/BarberDashboard', () => ({ BarberDashboard: () => null }));
vi.mock('../features/reception/workspace/ReceptionWorkspace', () => ({
  ReceptionWorkspace: ({ onLogout }: { onLogout: () => void }) => (
    <button onClick={onLogout}>Cerrar sesión</button>
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guest = false;
  mocks.logout.mockResolvedValue(undefined);
  mocks.session.mockImplementation(async () => ({
    data: { session: mocks.guest ? null : { user: { id: 'barber' } } },
  }));
  mocks.rpc.mockResolvedValue({ data: { id: 'barber' }, error: null });
});
function open(portal: string, element: React.ReactNode) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <h1>Acceso unificado</h1> },
      { path: portal, element },
    ],
    { initialEntries: [portal] }
  );
  render(<RouterProvider router={router} />);
  return router;
}
const portals = [
  ['/admin', <AdminLayout />],
  ['/barbero', <BarberLayout />],
  ['/recepcion', <ReceptionLayout />],
] as const;
it.each(portals)('cerrar sesión desde %s vuelve a la raíz', async (path, element) => {
  const router = open(path, element);
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Acceso unificado' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
  expect(mocks.logout).toHaveBeenCalledOnce();
});
it.each(portals)('sin sesión %s dirige al mismo acceso', async (path, element) => {
  mocks.guest = true;
  const router = open(path, element);
  expect(await screen.findByRole('heading', { name: 'Acceso unificado' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
});
it('conserva la pantalla y muestra error si falla el cierre', async () => {
  mocks.logout.mockRejectedValue(new Error('offline'));
  const router = open('/admin', <AdminLayout />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cerrar'));
  expect(router.state.location.pathname).toBe('/admin');
});
