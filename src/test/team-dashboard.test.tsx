import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { TeamDashboard } from '../features/staff/dashboard/TeamDashboard';
import { WeekResults } from '../features/staff/dashboard/WeekResults';
import {
  leaders,
  weekStart,
  weeklyTotals,
  type WeeklyBarber,
} from '../features/staff/dashboard/model';
import { loadTeamWeek } from '../features/staff/dashboard/service';
import { listBranches } from '../features/branches/services/branch-service';
vi.mock('../features/staff/dashboard/service', () => ({ loadTeamWeek: vi.fn() }));
vi.mock('../features/branches/services/branch-service', () => ({ listBranches: vi.fn() }));
const rows: WeeklyBarber[] = [
  {
    employee_id: 'a',
    full_name: 'Ana',
    username: 'ana',
    service_count: 4,
    revenue_cents: 100000,
    commission_cents: 30000,
  },
  {
    employee_id: 'b',
    full_name: 'Bruno',
    username: 'bruno',
    service_count: 6,
    revenue_cents: 90000,
    commission_cents: 45000,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadTeamWeek).mockResolvedValue(rows);
  vi.mocked(listBranches).mockResolvedValue([
    {
      id: 'irigoyen',
      name: 'Irigoyen',
      active: true,
      address: '',
      phone: '',
      created_at: '',
      updated_at: '',
    },
  ]);
});
it('resuelve semanas de lunes a domingo y cambios de año', () => {
  expect(weekStart('2026-10-25')).toBe('2026-10-19');
  expect(weekStart('2026-10-26')).toBe('2026-10-26');
  expect(weekStart('2027-01-01')).toBe('2026-12-28');
});
it('distingue líderes por generado, cantidad y comisión; reconoce empates y ceros', () => {
  expect(leaders(rows, 'revenue_cents').map(row => row.employee_id)).toEqual(['a']);
  expect(leaders(rows, 'service_count').map(row => row.employee_id)).toEqual(['b']);
  expect(leaders(rows, 'commission_cents').map(row => row.employee_id)).toEqual(['b']);
  expect(leaders([...rows, { ...rows[0]!, employee_id: 'c' }], 'revenue_cents')).toHaveLength(2);
  expect(leaders([{ ...rows[0]!, commission_cents: 0 }], 'commission_cents')).toEqual([]);
  expect(weeklyTotals(rows)).toEqual({ services: 10, revenue: 190000, commission: 75000 });
});
it('muestra líderes con enlaces a sus fichas', () => {
  render(
    <MemoryRouter>
      <WeekResults rows={rows} />
    </MemoryRouter>
  );
  expect(screen.getByText('Más generó')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Ana' })[0]).toHaveAttribute(
    'href',
    '/admin/personal/a'
  );
  expect(screen.getByText('Más servicios realizó')).toBeInTheDocument();
  expect(screen.getByText('Más comisión acumuló')).toBeInTheDocument();
});
it('cambia la consulta al seleccionar sucursal y otra semana', async () => {
  render(
    <MemoryRouter>
      <TeamDashboard />
    </MemoryRouter>
  );
  await screen.findByRole('option', { name: 'Irigoyen' });
  await userEvent.selectOptions(screen.getByLabelText('Sucursal del servicio'), 'irigoyen');
  await waitFor(() =>
    expect(loadTeamWeek).toHaveBeenLastCalledWith(expect.any(String), 'irigoyen')
  );
  const currentStart = vi.mocked(loadTeamWeek).mock.lastCall![0];
  await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
  await waitFor(() => expect(vi.mocked(loadTeamWeek).mock.lastCall![0]).not.toBe(currentStart));
});
it('distingue falta de actividad de un fallo de carga', async () => {
  vi.mocked(loadTeamWeek).mockRejectedValue(new Error('Fallo de conexión'));
  render(
    <MemoryRouter>
      <TeamDashboard />
    </MemoryRouter>
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Fallo de conexión');
  expect(screen.queryByText(/Todavía no hay servicios/)).not.toBeInTheDocument();
  vi.mocked(loadTeamWeek).mockResolvedValue([]);
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar resumen' }));
  expect(await screen.findByText(/Todavía no hay servicios/)).toBeInTheDocument();
});
