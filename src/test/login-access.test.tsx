import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { AdminAccess } from '../features/staff/components/AdminAccess';
import { signInAdmin } from '../features/staff/services/admin-session';
import { loginEmail } from '../features/staff/services/login-identity';
vi.mock('../features/staff/services/admin-session', () => ({ signInAdmin: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
});
it('normaliza usuarios sin requerir email y conserva correos de administrador', () => {
  expect(loginEmail(' YoelRecepcionista ')).toBe('yoelrecepcionista@staff.huomo.invalid');
  expect(loginEmail(' admin@huomobarber.com.ar ')).toBe('admin@huomobarber.com.ar');
});
it('acepta un nombre de usuario desde /admin y dirige recepción a su portal', async () => {
  vi.mocked(signInAdmin).mockResolvedValue('reception');
  const success = vi.fn();
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminAccess onSuccess={success} />} />
        <Route path="/recepcion" element={<h1>Caja de recepción</h1>} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByLabelText('Usuario o email')).toHaveAttribute('type', 'text');
  await userEvent.type(screen.getByLabelText('Usuario o email'), 'yoelrecepcionista');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'password-test');
  await userEvent.click(screen.getByRole('button', { name: /Ingresar al sistema/ }));
  expect(await screen.findByRole('heading', { name: 'Caja de recepción' })).toBeInTheDocument();
  expect(signInAdmin).toHaveBeenCalledWith('yoelrecepcionista', 'password-test');
  expect(success).not.toHaveBeenCalled();
});
it('mantiene el acceso administrativo cuando el rol es admin', async () => {
  vi.mocked(signInAdmin).mockResolvedValue('admin');
  const success = vi.fn();
  render(
    <MemoryRouter>
      <AdminAccess onSuccess={success} />
    </MemoryRouter>
  );
  await userEvent.type(screen.getByLabelText('Usuario o email'), 'admin@huomobarber.com.ar');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'password-test');
  await userEvent.click(screen.getByRole('button', { name: /Ingresar al sistema/ }));
  await waitFor(() => expect(success).toHaveBeenCalledOnce());
});
it('dirige al barbero a su propio portal', async () => {
  vi.mocked(signInAdmin).mockResolvedValue('barber');
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminAccess onSuccess={vi.fn()} />} />
        <Route path="/barbero" element={<h1>Mi espacio de barbero</h1>} />
      </Routes>
    </MemoryRouter>
  );
  await userEvent.type(screen.getByLabelText('Usuario o email'), 'yoelhuomo');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'password-test');
  await userEvent.click(screen.getByRole('button', { name: /Ingresar al sistema/ }));
  expect(await screen.findByRole('heading', { name: 'Mi espacio de barbero' })).toBeInTheDocument();
});
