import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarberDashboard } from '../features/barber/dashboard/BarberDashboard';
import {
  loadBarberDashboard,
  type BarberDashboardData,
} from '../features/barber/dashboard/service';
vi.mock('../features/barber/dashboard/service', () => ({ loadBarberDashboard: vi.fn() }));
const data: BarberDashboardData = {
  weekStart: '2026-10-19',
  count: 2,
  revenue: 4000000,
  commission: 1200000,
  fixedMonth: '2026-10-01',
  fixed: null,
  services: [
    {
      key: 'cut',
      name: 'Corte',
      assigned: true,
      active: true,
      count: 2,
      revenue: 4000000,
      commission: 1200000,
    },
    {
      key: 'beard',
      name: 'Barba',
      assigned: true,
      active: true,
      count: 0,
      revenue: 0,
      commission: 0,
    },
  ],
  days: [{ date: '2026-10-19', count: 2, commission: 1200000 }],
  recent: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadBarberDashboard).mockResolvedValue(data);
});
it('muestra servicios asignados y comisión sin presentar fijo cuando no existe', async () => {
  render(<BarberDashboard employeeId="own" />);
  await screen.findByText('Mi comisión semanal');
  expect(screen.getByText('Corte')).toBeInTheDocument();
  expect(screen.getByText('Barba')).toBeInTheDocument();
  expect(screen.queryByText('FIJO MENSUAL')).not.toBeInTheDocument();
  expect(screen.getByText('Mi agenda de turnos')).toBeInTheDocument();
});
it('oculta fijo cero y muestra un fijo positivo con su mes', async () => {
  vi.mocked(loadBarberDashboard)
    .mockResolvedValueOnce({ ...data, fixed: 0 })
    .mockResolvedValue({ ...data, fixed: 25000000 });
  render(<BarberDashboard employeeId="own" />);
  await screen.findByText('Mi comisión semanal');
  expect(screen.queryByText('FIJO MENSUAL')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar mi resumen' }));
  expect(await screen.findByText('FIJO MENSUAL')).toBeInTheDocument();
  expect(screen.getByText(/Correspondiente a octubre de 2026/)).toBeInTheDocument();
});
it('permite cambiar de semana sin enviar un identificador de otro empleado', async () => {
  render(<BarberDashboard employeeId="own" />);
  await screen.findByText('Mi comisión semanal');
  const first = vi.mocked(loadBarberDashboard).mock.lastCall![0];
  await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
  await waitFor(() => expect(vi.mocked(loadBarberDashboard).mock.lastCall![0]).not.toBe(first));
  expect(vi.mocked(loadBarberDashboard).mock.lastCall).toHaveLength(1);
});
it('distingue error de datos de una semana vacía', async () => {
  vi.mocked(loadBarberDashboard).mockRejectedValue(new Error('No se pudo cargar tu resumen.'));
  render(<BarberDashboard employeeId="own" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar');
  expect(screen.queryByText('Mi comisión semanal')).not.toBeInTheDocument();
});
