import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CashPage } from '../features/cash/CashPage';
import { CollectForm } from '../features/cash/CollectForm';
import { cashSummary, dayBounds, type Payment, type PendingService } from '../features/cash/model';
import { collectPayment, loadCashDay, voidPayment } from '../features/cash/service';
import { listBranches } from '../features/branches/services/branch-service';
vi.mock('../features/cash/service', () => ({
  collectPayment: vi.fn(),
  loadCashDay: vi.fn(),
  voidPayment: vi.fn(),
}));
vi.mock('../features/branches/services/branch-service', () => ({ listBranches: vi.fn() }));
const pending: PendingService = {
  id: 'service',
  employee_id: 'barber',
  barber_name: 'Yoel',
  service_name: 'Corte',
  branch_id: 'branch',
  branch_name: 'Irigoyen',
  amount_cents: 2000000,
  performed_at: '2026-10-20T12:00:00Z',
};
const payment: Payment = {
  sale_payload: null,
  id: 'payment',
  request_id: 'request',
  service_id: 'service',
  employee_id: 'barber',
  barber_name: 'Yoel',
  service_name: 'Corte',
  branch_id: 'branch',
  branch_name: 'Irigoyen',
  amount_cents: 2000000,
  method: 'cash',
  paid_at: '2026-10-20T13:00:00Z',
  recorded_by: 'admin',
  created_at: '2026-10-20T13:00:00Z',
  notes: '',
  reference: '',
  voided_at: null,
  void_reason: null,
  voided_by: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listBranches).mockResolvedValue([]);
  vi.mocked(loadCashDay).mockResolvedValue({
    payments: [payment, { ...payment, id: 'transfer', method: 'transfer', amount_cents: 1000000 }],
    pending: [pending],
  });
  vi.mocked(collectPayment).mockResolvedValue();
  vi.mocked(voidPayment).mockResolvedValue();
});
it('separa efectivo y transferencia, excluye anulados y usa límites de Argentina', () => {
  expect(
    cashSummary([
      payment,
      { ...payment, method: 'transfer', amount_cents: 1000000 },
      { ...payment, voided_at: '2026-10-21T12:00:00Z' },
    ])
  ).toEqual({
    cash: 2000000,
    transfer: 1000000,
    cashCount: 1,
    transferCount: 1,
    voided: 1,
    total: 3000000,
  });
  expect(dayBounds('2026-12-31')).toEqual({
    from: '2026-12-31T00:00:00-03:00',
    to: '2027-01-01T00:00:00-03:00',
  });
});
it('registra un cobro vinculado al servicio, sin permitir cambiar el importe', async () => {
  const saved = vi.fn();
  render(<CollectForm service={pending} onSaved={saved} onCancel={vi.fn()} />);
  expect(screen.queryByLabelText(/Importe/)).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Medio de pago'), 'transfer');
  await userEvent.type(screen.getByLabelText('Referencia o comprobante (opcional)'), 'REF-123');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await waitFor(() =>
    expect(collectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: 'service',
        method: 'transfer',
        reference: 'REF-123',
        requestId: expect.any(String),
      })
    )
  );
  expect(saved).toHaveBeenCalledOnce();
});
it('reutiliza el identificador de operación al reintentar después de un fallo de conexión', async () => {
  vi.mocked(collectPayment).mockRejectedValueOnce(new Error('Error de red')).mockResolvedValue();
  render(<CollectForm service={pending} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.selectOptions(screen.getByLabelText('Medio de pago'), 'cash');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await screen.findByText('Error de red');
  const first = vi.mocked(collectPayment).mock.calls[0]![0];
  await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
  await waitFor(() => expect(collectPayment).toHaveBeenCalledTimes(2));
  expect(vi.mocked(collectPayment).mock.calls[1]![0]).toEqual(first);
});
it('muestra medios de pago, pendientes y permite anular con motivo', async () => {
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  await screen.findByText('Cobros registrados');
  expect(screen.getByRole('button', { name: 'Cobrar' })).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Medio de pago'), 'cash');
  expect(screen.getAllByRole('button', { name: 'Anular cobro' })).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Anular cobro' }));
  await userEvent.type(screen.getByLabelText('Motivo de anulación'), 'Medio incorrecto');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
  await waitFor(() => expect(voidPayment).toHaveBeenCalledWith('payment', 'Medio incorrecto'));
});
it('un fallo de carga no muestra ceros como si la caja estuviera vacía', async () => {
  vi.mocked(loadCashDay).mockRejectedValue(new Error('Fallo de Caja'));
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Fallo de Caja');
  expect(screen.queryByText('Total cobrado')).not.toBeInTheDocument();
});
