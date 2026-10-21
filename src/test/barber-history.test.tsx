import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentServices } from '../features/barber/dashboard/RecentServices';
import { loadBarberHistory } from '../features/barber/dashboard/service';
vi.mock('../features/barber/dashboard/service', () => ({ loadBarberHistory: vi.fn() }));
const job = {
  id: 'one',
  service_name: 'Corte con barba y tratamiento completo',
  performed_at: '2026-10-21T12:00:00Z',
  amount_cents: 123456789,
  commission_cents: 37037037,
  branch_name: 'Irigoyen',
};
beforeEach(() => {
  vi.clearAllMocks();
});
it('permite consultar servicios posteriores al límite anterior de veinte', async () => {
  vi.mocked(loadBarberHistory).mockImplementation(async (_, page) => ({
    total: 25,
    items: Array.from({ length: page === 0 ? 20 : 5 }, (_, i) => ({
      ...job,
      id: String(page * 20 + i),
    })),
  }));
  render(<RecentServices week="2026-10-19" />);
  expect(await screen.findByText('1–20 de 25 servicios')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Anteriores' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Siguientes' }));
  expect(await screen.findByText('21–25 de 25 servicios')).toBeInTheDocument();
  expect(loadBarberHistory).toHaveBeenLastCalledWith('2026-10-19', 1);
  expect(screen.getByRole('button', { name: 'Siguientes' })).toBeDisabled();
  expect(screen.getAllByText('$ 1.234.567,89', { exact: false }).length).toBeGreaterThan(0);
});
it('un error de historial permite reintentar sin cerrar la sesión', async () => {
  vi.mocked(loadBarberHistory)
    .mockRejectedValueOnce(new Error('Fallo de historial'))
    .mockResolvedValue({ total: 0, items: [] });
  render(<RecentServices week="2026-10-19" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Fallo de historial');
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }));
  await waitFor(() =>
    expect(screen.getByText('No hay servicios realizados en esta semana.')).toBeInTheDocument()
  );
});
