import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BranchesPage } from '../features/branches/pages/BranchesPage';
import { BranchPricePanel } from '../features/branches/components/BranchPricePanel';
import {
  listBranches,
  loadBranchPrices,
  saveBranch,
  saveBranchPrices,
  type Branch,
} from '../features/branches/services/branch-service';

vi.mock('../features/branches/services/branch-service', () => ({
  listBranches: vi.fn(),
  loadBranchPrices: vi.fn(),
  saveBranch: vi.fn(),
  saveBranchPrices: vi.fn(),
  setBranchActive: vi.fn(),
}));
vi.mock('../features/branches/finance/service', () => ({ loadBranchBalances: async () => [] }));
const branches: Branch[] = [
  {
    id: 'irigoyen',
    name: 'Irigoyen',
    active: true,
    address: '',
    phone: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'mosconi',
    name: 'Mosconi',
    active: true,
    address: '',
    phone: '',
    created_at: '',
    updated_at: '',
  },
];
describe('Sucursales y precios independientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listBranches).mockResolvedValue(branches);
    vi.mocked(loadBranchPrices).mockResolvedValue([]);
    vi.mocked(saveBranch).mockResolvedValue();
    vi.mocked(saveBranchPrices).mockResolvedValue();
  });
  it('permite crear una tercera sucursal desde administración', async () => {
    render(
      <MemoryRouter>
        <BranchesPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: /Irigoyen/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Nueva sucursal/ }));
    await userEvent.type(screen.getByLabelText('Nombre de la sucursal'), 'Nueva ubicación');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar sucursal' }));
    await waitFor(() =>
      expect(saveBranch).toHaveBeenCalledWith(
        { name: 'Nueva ubicación', address: '', phone: '' },
        undefined
      )
    );
  });
  it('guarda precios diferentes del mismo servicio por sucursal', async () => {
    render(
      <BranchPricePanel serviceId="cut" serviceName="Corte" onSaved={vi.fn()} onCancel={vi.fn()} />
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Disponible en Irigoyen' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Disponible en Mosconi' }));
    await userEvent.type(screen.getByLabelText('Precio en Irigoyen (ARS)'), '20000');
    await userEvent.type(screen.getByLabelText('Precio en Mosconi (ARS)'), '23000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar precios por sucursal' }));
    await waitFor(() =>
      expect(saveBranchPrices).toHaveBeenCalledWith('cut', [
        { branch_id: 'irigoyen', active: true, price_cents: 2000000 },
        { branch_id: 'mosconi', active: true, price_cents: 2300000 },
      ])
    );
  });
  it('no habilita un servicio en una sucursal sin ingresar precio', async () => {
    render(
      <BranchPricePanel serviceId="cut" serviceName="Corte" onSaved={vi.fn()} onCancel={vi.fn()} />
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Disponible en Irigoyen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar precios por sucursal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá el precio de Irigoyen');
    expect(saveBranchPrices).not.toHaveBeenCalled();
  });
});
