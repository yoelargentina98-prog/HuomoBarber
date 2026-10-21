import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAdminAccess } from '../features/admin/hooks/useAdminAccess';
import { hasAdminSession } from '../features/staff/services/admin-session';
const events = vi.hoisted(() => ({ callback: () => {} }));
vi.mock('../features/staff/services/admin-session', () => ({
  hasAdminSession: vi.fn(),
  onSessionChange: (callback: () => void) => {
    events.callback = callback;
    return () => {};
  },
}));
function Gate() {
  const access = useAdminAccess();
  return access.status === 'guest' ? (
    <p role="alert">Mensaje del formulario</p>
  ) : (
    <p>Verificando sesión</p>
  );
}
it('no desmonta el formulario durante eventos de autenticación', async () => {
  vi.mocked(hasAdminSession)
    .mockResolvedValueOnce(false)
    .mockImplementation(() => new Promise(() => {}));
  render(<Gate />);
  const original = await screen.findByRole('alert');
  await act(async () => {
    events.callback();
  });
  expect(screen.getByRole('alert')).toBe(original);
});
