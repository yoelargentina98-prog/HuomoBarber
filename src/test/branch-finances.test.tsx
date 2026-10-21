import { loadPage } from '../shared/lib/pages';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BranchComparison } from '../features/branches/finance/BranchComparison';
import { ExpenseForm } from '../features/branches/finance/ExpenseForm';
import { ExpenseList } from '../features/branches/finance/ExpenseList';
import {
  loadBranchBalances,
  loadBranchCommissions,
  saveExpense,
  voidExpense,
  type BranchExpense,
} from '../features/branches/finance/service';
vi.mock('../features/branches/finance/service', async importOriginal => ({
  ...(await importOriginal<typeof import('../features/branches/finance/service')>()),
  loadBranchBalances: vi.fn(),
  loadBranchCommissions: vi.fn(),
  saveExpense: vi.fn(),
  voidExpense: vi.fn(),
}));
vi.mock('../shared/lib/pages', () => ({ loadPage: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadBranchBalances).mockResolvedValue([
    {
      branch_id: 'a',
      branch_name: 'Irigoyen',
      active: true,
      income_cents: 1000000,
      expense_cents: 1500000,
      commission_cents: 300000,
      total_cost_cents: 1800000,
      balance_cents: -800000,
      payment_count: 1,
    },
    {
      branch_id: 'b',
      branch_name: 'Mosconi',
      active: true,
      income_cents: 2000000,
      expense_cents: 500000,
      commission_cents: 600000,
      total_cost_cents: 1100000,
      balance_cents: 900000,
      payment_count: 2,
    },
  ]);
  vi.mocked(saveExpense).mockResolvedValue();
  vi.mocked(voidExpense).mockResolvedValue();
});
it('compara sucursales con saldos negativos y enlaces a sus fichas', async () => {
  render(
    <MemoryRouter>
      <BranchComparison />
    </MemoryRouter>
  );
  expect(await screen.findByText('Mayor recaudación')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Irigoyen →' })).toHaveAttribute('href', '/sucursal/a');
  expect(screen.getAllByText('Mosconi').length).toBe(2);
  expect(screen.getByText(/-\$\s*8\.000,00/)).toBeInTheDocument();
  expect(screen.getByText('Comisiones generadas')).toBeInTheDocument();
});
it('registra un gasto con categoría, fecha y medio de pago', async () => {
  render(<ExpenseForm branch="a" month="2026-10" onSaved={vi.fn()} onClose={vi.fn()} />);
  await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'electricity');
  await userEvent.type(screen.getByLabelText('Concepto'), 'Factura de luz');
  await userEvent.type(screen.getByLabelText('Importe (ARS)'), '45000,50');
  await userEvent.selectOptions(screen.getByLabelText('Cómo se pagó'), 'transfer');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar gasto' }));
  await waitFor(() =>
    expect(saveExpense).toHaveBeenCalledWith(
      'a',
      expect.any(String),
      expect.objectContaining({
        category: 'electricity',
        description: 'Factura de luz',
        amount: 4500050,
        method: 'transfer',
      })
    )
  );
});
it('anula un gasto con motivo sin borrarlo', async () => {
  const expense: BranchExpense = {
    id: 'expense',
    operation_id: 'request',
    branch_id: 'a',
    category: 'rent',
    description: 'Alquiler octubre',
    amount_cents: 100000,
    paid_on: '2026-10-01',
    method: 'cash',
    notes: '',
    recorded_by: 'admin',
    created_at: '',
    voided_at: null,
    voided_by: null,
    void_reason: null,
  };
  render(<ExpenseList expenses={[expense]} onSaved={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Anular gasto' }));
  await userEvent.type(screen.getByLabelText('Motivo de anulación'), 'Duplicado');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
  await waitFor(() => expect(voidExpense).toHaveBeenCalledWith('expense', 'Duplicado'));
});

it('muestra cada barbero con su costo, incluso sin servicios y con histórico de otra sucursal', async () => {
  vi.mocked(loadBranchCommissions).mockResolvedValue([
    {
      employee_id: 'barber-a',
      full_name: 'Yoel Zoff',
      username: 'yoelhuomo',
      active: true,
      belongs_here: true,
      service_count: 1,
      commission_cents: 750000,
    },
    {
      employee_id: 'barber-b',
      full_name: 'Barbero sin trabajos',
      username: 'sintrabajos',
      active: true,
      belongs_here: true,
      service_count: 0,
      commission_cents: 0,
    },
    {
      employee_id: 'barber-c',
      full_name: 'Barbero trasladado',
      username: 'trasladado',
      active: true,
      belongs_here: false,
      service_count: 1,
      commission_cents: 300000,
    },
  ]);
  vi.mocked(loadPage).mockImplementation(async () => {
    const rows = await loadBranchCommissions('a', '2026-10');
    return { rows, total: rows.length, page: 0 };
  });
  const { BranchCommissions } = await import('../features/branches/finance/BranchCommissions');
  render(
    <MemoryRouter>
      <BranchCommissions branch="a" month="2026-10" revision={0} />
    </MemoryRouter>
  );
  expect(await screen.findByRole('link', { name: 'Yoel Zoff' })).toHaveAttribute(
    'href',
    '/admin/personal/barber-a'
  );
  expect(screen.getByText('Barbero sin trabajos')).toBeInTheDocument();
  expect(screen.getByText('Histórico: actualmente en otra sucursal')).toBeInTheDocument();
  expect(loadBranchCommissions).toHaveBeenCalledWith('a', '2026-10');
});
