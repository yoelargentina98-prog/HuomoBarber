import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaleFields } from '../features/cash/sales/SaleFields';
import { registerSale } from '../features/cash/sales/service';
import { lookupClient } from '../features/club/service';
vi.mock('../features/cash/sales/service', () => ({ registerSale: vi.fn() }));
vi.mock('../features/club/service', () => ({ lookupClient: vi.fn(), clubHistory: vi.fn() }));
const options = [
  {
    employee_id: 'barber',
    barber_name: 'Barbero',
    service_id: 'cut',
    service_name: 'Corte',
    price_cents: 2000000,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(registerSale).mockResolvedValue();
});
async function fill() {
  await userEvent.selectOptions(screen.getByLabelText('Barbero'), 'barber');
  await userEvent.selectOptions(screen.getByLabelText('Servicio'), 'cut');
  await userEvent.selectOptions(screen.getByLabelText('Cómo se pagó'), 'cash');
}
it('busca automáticamente el número y vincula la venta al cliente confirmado', async () => {
  vi.mocked(lookupClient).mockResolvedValue({
    id: 'client',
    full_name: 'Cliente de prueba',
    customer_number: '12345',
  });
  render(<SaleFields branch="branch" options={options} onSaved={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/Número de cliente/), '12345');
  expect(await screen.findByText('Cliente de prueba')).toBeInTheDocument();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await waitFor(() =>
    expect(registerSale).toHaveBeenCalledWith(
      expect.objectContaining({ customerNumber: '12345' }),
      expect.any(String)
    )
  );
});
it('no guarda un número inexistente y permite continuar como ocasional al borrarlo', async () => {
  vi.mocked(lookupClient).mockRejectedValue(new Error('No existe un cliente con ese número.'));
  render(<SaleFields branch="branch" options={options} onSaved={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/Número de cliente/), '99999');
  expect(await screen.findByText('No existe un cliente con ese número.')).toBeInTheDocument();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  expect(registerSale).not.toHaveBeenCalled();
  await userEvent.clear(screen.getByLabelText(/Número de cliente/));
  await userEvent.click(screen.getByRole('button', { name: 'Registrar venta y cobro' }));
  await waitFor(() => expect(registerSale).toHaveBeenCalledOnce());
  expect(vi.mocked(registerSale).mock.calls[0]?.[0].customerNumber).toBeUndefined();
});
