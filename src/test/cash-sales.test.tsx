import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CashPage } from '../features/cash/CashPage';
import { registerSale, saleOptions, saleSetup } from '../features/cash/sales/service';
import { loadCashDay } from '../features/cash/service';
import { listBranches } from '../features/branches/services/branch-service';
vi.mock('../features/cash/service', () => ({
  loadCashDay: vi.fn(),
  collectPayment: vi.fn(),
  voidPayment: vi.fn(),
}));
vi.mock('../features/cash/sales/service', () => ({
  registerSale: vi.fn(),
  saleOptions: vi.fn(),
  saleSetup: vi.fn(),
}));
vi.mock('../features/branches/services/branch-service', () => ({ listBranches: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saleSetup).mockResolvedValue({
    branchActive: true,
    serviceCount: 1,
    barbers: [{ id: 'barber-a', name: 'Yoel', active: true, enabledCount: 0 }],
  });
  vi.mocked(loadCashDay).mockResolvedValue({ payments: [], pending: [] });
  vi.mocked(listBranches).mockResolvedValue([
    {
      id: 'branch-a',
      name: 'Irigoyen',
      active: true,
      address: '',
      phone: '',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'branch-b',
      name: 'Mosconi',
      active: true,
      address: '',
      phone: '',
      created_at: '',
      updated_at: '',
    },
  ]);
  vi.mocked(saleOptions).mockResolvedValue([
    {
      employee_id: 'barber-a',
      barber_name: 'Yoel',
      service_id: 'cut',
      service_name: 'Corte',
      price_cents: 2000000,
    },
  ]);
  vi.mocked(registerSale).mockResolvedValue();
});
async function chooseSale() {
  await userEvent.selectOptions(await screen.findByLabelText('Barbero'), 'barber-a');
  await userEvent.selectOptions(screen.getByLabelText('Servicio'), 'cut');
  await userEvent.selectOptions(screen.getByLabelText('Cómo se pagó'), 'transfer');
}
it('abre un modal y permite al administrador elegir sucursal y registrar venta completa', async () => {
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  const modal = screen.getByRole('dialog', { name: 'Nueva venta' });
  expect(modal).toHaveAttribute('open');
  await userEvent.selectOptions(within(modal).getByLabelText('Sucursal de la venta'), 'branch-a');
  await chooseSale();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await waitFor(() =>
    expect(registerSale).toHaveBeenCalledWith(
      {
        branch: 'branch-a',
        employee: 'barber-a',
        service: 'cut',
        method: 'transfer',
        price: 2000000,
        reference: '',
        notes: '',
      },
      expect.any(String)
    )
  );
  expect(
    await screen.findByText('Venta registrada: servicio, comisión y cobro guardados.')
  ).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('recepción no elige otra sucursal ni ve acciones de administración', async () => {
  render(
    <MemoryRouter>
      <CashPage operator={{ role: 'reception', branchId: 'branch-a', branchName: 'Irigoyen' }} />
    </MemoryRouter>
  );
  await waitFor(() => expect(loadCashDay).toHaveBeenCalledWith(expect.any(String), 'branch-a'));
  expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  expect(screen.queryByLabelText('Sucursal de la venta')).not.toBeInTheDocument();
  await chooseSale();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await waitFor(() =>
    expect(registerSale).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'branch-a' }),
      expect.any(String)
    )
  );
});
it('un reintento usa la misma operación y datos aunque el formulario quede bloqueado', async () => {
  vi.mocked(registerSale).mockRejectedValueOnce(new Error('Fallo de conexión')).mockResolvedValue();
  render(
    <MemoryRouter>
      <CashPage operator={{ role: 'reception', branchId: 'branch-a', branchName: 'Irigoyen' }} />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  await chooseSale();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await screen.findByText('Fallo de conexión');
  expect(screen.getByLabelText('Servicio')).toBeDisabled();
  const first = vi.mocked(registerSale).mock.calls[0];
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await waitFor(() => expect(registerSale).toHaveBeenCalledTimes(2));
  expect(vi.mocked(registerSale).mock.calls[1]).toEqual(first);
});
it('cierra el modal y restaura el desplazamiento del fondo', async () => {
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  expect(document.body.style.overflow).toBe('hidden');
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe('hidden');
});
it('explica la falta de asignaciones y ofrece acceso directo al administrador', async () => {
  vi.mocked(saleOptions).mockResolvedValue([]);
  render(
    <MemoryRouter>
      <CashPage />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  await userEvent.selectOptions(screen.getByLabelText('Sucursal de la venta'), 'branch-a');
  expect(await screen.findByText(/La sucursal tiene servicios con precio/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Asignar servicios a Yoel →' })).toHaveAttribute(
    'href',
    '/admin/personal/barber-a?tab=assignments'
  );
});
it('recepción recibe la causa sin enlaces administrativos', async () => {
  vi.mocked(saleOptions).mockResolvedValue([]);
  render(
    <MemoryRouter>
      <CashPage operator={{ role: 'reception', branchId: 'branch-a', branchName: 'Irigoyen' }} />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }));
  expect(await screen.findByText(/Pedile al administrador/)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Asignar servicios/ })).not.toBeInTheDocument();
});
