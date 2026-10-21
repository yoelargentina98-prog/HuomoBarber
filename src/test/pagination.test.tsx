import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Paginated } from '../shared/components/Paginated';
import { loadPage } from '../shared/lib/pages';
import { CashPage } from '../features/cash/CashPage';
import type { Payment } from '../features/cash/model';

vi.mock('../shared/lib/pages', () => ({ loadPage: vi.fn() }));
vi.mock('../features/branches/services/branch-service', () => ({ listBranches: async () => [] }));
vi.mock('../features/cash/service', () => ({
  loadCashDay: async () => ({
    payments: [],
    pending: [],
    paginated: true,
    summary: {
      cash: 650000,
      transfer: 650000,
      total: 1300000,
      cashCount: 65,
      transferCount: 65,
      voided: 0,
      pendingCount: 0,
    },
  }),
  voidPayment: vi.fn(),
  collectPayment: vi.fn(),
}));
const payments: Payment[] = Array.from({ length: 130 }, (_, index) => ({
  id: `receipt-${index}`,
  request_id: `request-${index}`,
  service_id: `service-${index}`,
  employee_id: 'barber',
  barber_name: 'Yoel',
  service_name: `Trabajo ${index}`,
  branch_id: 'branch',
  branch_name: 'Irigoyen',
  amount_cents: 10000,
  method: index % 2 ? 'transfer' : 'cash',
  paid_at: '2026-10-21T12:00:00Z',
  recorded_by: 'admin',
  created_at: '',
  notes: '',
  reference: '',
  voided_at: null,
  voided_by: null,
  void_reason: null,
  sale_payload: null,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadPage).mockImplementation(async (source, page = 0, size = 20) => {
    const filtered =
      source.resource === 'cash_pending'
        ? []
        : payments.filter(
            row => source.filters.method === 'all' || row.method === source.filters.method
          );
    return { rows: filtered.slice(page * size, (page + 1) * size), page, total: filtered.length };
  });
});
it('limita las colecciones a 20 y vuelve al inicio al cambiar el filtro', async () => {
  const items = Array.from({ length: 43 }, (_, id) => ({ id }));
  const view = render(
    <Paginated items={items}>
      {rows => (
        <ul>
          {rows.map(row => (
            <li key={row.id}>Fila {row.id}</li>
          ))}
        </ul>
      )}
    </Paginated>
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(20);
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Fila 20')).toBeInTheDocument();
  expect(screen.queryByText('Fila 0')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  view.rerender(
    <Paginated items={items.slice(0, 22)}>
      {rows => (
        <ul>
          {rows.map(row => (
            <li key={row.id}>Fila {row.id}</li>
          ))}
        </ul>
      )}
    </Paginated>
  );
  expect(screen.getByText('Fila 0')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(20);
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
});
it('Caja muestra 45 transferencias filtradas por página y conserva los totales del día', async () => {
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  await screen.findByText('Trabajo 0');
  expect(screen.getAllByRole('row')).toHaveLength(21);
  await userEvent.selectOptions(screen.getByLabelText('Medio de pago'), 'transfer');
  await screen.findByText('Trabajo 1');
  const size = screen.getAllByRole('spinbutton', { name: 'Filas por página' })[0]!;
  await userEvent.clear(size);
  await userEvent.type(size, '45');
  await userEvent.tab();
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(46));
  expect(screen.queryByText('Trabajo 0')).not.toBeInTheDocument();
  expect(screen.getByText('Trabajo 89')).toBeInTheDocument();
  expect(screen.getByText('$ 13.000,00')).toBeInTheDocument();
  expect(loadPage).toHaveBeenCalledWith(
    expect.objectContaining({ filters: expect.objectContaining({ method: 'transfer' }) }),
    0,
    45
  );
  await userEvent.click(screen.getAllByRole('button', { name: 'Siguiente' })[0]!);
  await screen.findByText('Trabajo 91');
  expect(screen.getAllByRole('row')).toHaveLength(21);
  expect(screen.getByText('46–65 de 65')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Medio de pago'), 'cash');
  await screen.findByText('Trabajo 0');
  expect(screen.getAllByRole('row')).toHaveLength(46);
  expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(45);
});
