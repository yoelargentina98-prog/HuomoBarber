import { loadPage } from '../shared/lib/pages';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReceptionWorkspace } from '../features/reception/workspace/ReceptionWorkspace';
import { loadReceptionTeam } from '../features/reception/workspace/service';
import { loadCashDay } from '../features/cash/service';
import { listBranches } from '../features/branches/services/branch-service';
import { saleOptions } from '../features/cash/sales/service';
vi.mock('../features/reception/workspace/service', () => ({
  loadReceptionTeam: vi.fn(),
  loadReceptionTeamCount: async () => 1,
}));
vi.mock('../features/cash/service', () => ({
  loadCashDay: vi.fn(),
  collectPayment: vi.fn(),
  voidPayment: vi.fn(),
}));
vi.mock('../features/branches/services/branch-service', () => ({ listBranches: vi.fn() }));
vi.mock('../features/cash/sales/service', () => ({
  saleOptions: vi.fn(),
  saleSetup: vi.fn(),
  registerSale: vi.fn(),
}));
vi.mock('../shared/lib/pages', () => ({ loadPage: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadPage).mockImplementation(async source => {
    const rows = (await loadReceptionTeam(source.filters.branch ?? '')).filter(
      row =>
        (source.filters.role === 'all' || row.role === source.filters.role) &&
        `${row.full_name} ${row.username}`
          .toLowerCase()
          .includes((source.filters.search ?? '').toLowerCase())
    );
    return { rows, page: 0, total: rows.length };
  });
  vi.mocked(listBranches).mockResolvedValue([]);
  vi.mocked(loadCashDay).mockResolvedValue({ payments: [], pending: [] });
  vi.mocked(loadReceptionTeam).mockResolvedValue([
    {
      id: 'barber',
      full_name: 'Yoel Zoff',
      username: 'yoelhuomo',
      role: 'barber',
      active: true,
      services: ['Corte con Barba'],
    },
    {
      id: 'reception',
      full_name: 'Yoel L',
      username: 'yoelrecepcionista',
      role: 'reception',
      active: true,
      services: [],
    },
  ]);
  vi.mocked(saleOptions).mockResolvedValue([
    {
      employee_id: 'barber',
      barber_name: 'Yoel Zoff',
      service_id: 'cut',
      service_name: 'Corte con Barba',
      price_cents: 2500000,
    },
  ]);
});
function renderWorkspace() {
  return render(
    <MemoryRouter>
      <ReceptionWorkspace
        operator={{
          role: 'reception',
          branchId: 'irigoyen',
          branchName: 'Irigoyen',
          name: 'Yoel L',
        }}
        busy={false}
        error=""
        onLogout={vi.fn()}
      />
    </MemoryRouter>
  );
}
it('muestra resumen y permite consultar y buscar empleados de la propia sucursal', async () => {
  renderWorkspace();
  expect(await screen.findByText('Total cobrado hoy')).toBeInTheDocument();
  await waitFor(() => expect(loadReceptionTeam).toHaveBeenCalledWith('irigoyen'));
  await userEvent.click(screen.getByRole('button', { name: 'Equipo de la sucursal' }));
  expect(await screen.findByText('Corte con Barba')).toBeInTheDocument();
  expect(screen.getByText('Yoel Zoff')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /administr/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Sucursal de consulta')).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Buscar en mi sucursal'), 'yoelhuomo');
  expect(screen.queryByText('@yoelrecepcionista')).not.toBeInTheDocument();
  expect(screen.getByText('@yoelhuomo')).toBeInTheDocument();
});
it('Nueva venta desde el resumen abre el modal de Caja con la sucursal fija', async () => {
  renderWorkspace();
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva venta' }));
  expect(await screen.findByRole('dialog', { name: 'Nueva venta' })).toBeInTheDocument();
  await waitFor(() => expect(saleOptions).toHaveBeenCalledWith('irigoyen'));
  expect(screen.queryByLabelText('Sucursal de la venta')).not.toBeInTheDocument();
});
it('una falla de equipo conserva la navegación y permite reintentar', async () => {
  vi.mocked(loadReceptionTeam).mockRejectedValue(
    new Error('No se pudo cargar el equipo de la sucursal.')
  );
  renderWorkspace();
  await userEvent.click(screen.getByRole('button', { name: 'Equipo de la sucursal' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el equipo');
  expect(screen.getByRole('button', { name: 'Actualizar equipo' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Recepción' })).toBeInTheDocument();
});
