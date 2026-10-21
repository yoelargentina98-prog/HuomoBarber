import { loadPage } from '../shared/lib/pages';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CatalogPage } from '../features/catalog/pages/CatalogPage';
import { BarberServicesPanel } from '../features/catalog/components/BarberServicesPanel';
import { RecordServiceForm } from '../features/catalog/components/RecordServiceForm';
import {
  assignBarberServices,
  listCatalog,
  loadBarberCatalog,
  saveCatalog,
  type CatalogService,
} from '../features/catalog/services/catalog-service';

vi.mock('../features/catalog/services/catalog-service', () => ({
  listCatalog: vi.fn(),
  loadBarberCatalog: vi.fn(),
  assignBarberServices: vi.fn(),
  saveCatalog: vi.fn(),
  setCatalogActive: vi.fn(),
}));
vi.mock('../shared/lib/pages', () => ({ loadPage: vi.fn() }));
function item(id: string, name: string, active = true): CatalogService {
  return {
    id,
    name,
    active,
    category: 'other',
    description: '',
    price_cents: 2000000,
    duration_minutes: 30,
    created_at: '',
    updated_at: '',
  };
}
const catalog = [
  item('cut', 'Corte'),
  item('brows', 'Perfilado de cejas'),
  item('color', 'Color'),
  item('inactive', 'Servicio inactivo', false),
];
describe('Catálogo y asignación por barbero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPage).mockImplementation(async source => {
      const rows = catalog.filter(
        row =>
          source.filters.status === 'all' || row.active === (source.filters.status === 'active')
      );
      return { rows, page: 0, total: rows.length };
    });
    vi.mocked(listCatalog).mockResolvedValue(catalog);
    vi.mocked(loadBarberCatalog).mockResolvedValue({ catalog, assigned: ['cut'] });
    vi.mocked(assignBarberServices).mockResolvedValue();
    vi.mocked(saveCatalog).mockResolvedValue();
  });
  it('crea servicios compartidos con duración y sin tarifa global', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );
    await screen.findByText('Perfilado de cejas');
    await userEvent.click(screen.getByRole('button', { name: /Nuevo servicio/ }));
    await userEvent.type(screen.getByLabelText('Nombre del servicio'), 'Color completo');
    expect(screen.queryByLabelText('Precio (ARS)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear servicio' }));
    await waitFor(() =>
      expect(saveCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Color completo',
          duration_minutes: 30,
        }),
        undefined
      )
    );
  });
  it('muestra checkboxes solo de servicios existentes y guarda la selección completa', async () => {
    const saved = vi.fn();
    render(
      <MemoryRouter>
        <BarberServicesPanel employeeId="employee" onSaved={saved} />
      </MemoryRouter>
    );
    expect(await screen.findByRole('checkbox', { name: /Corte/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Servicio inactivo/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /Perfilado de cejas/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar servicios del barbero' }));
    await waitFor(() =>
      expect(assignBarberServices).toHaveBeenCalledWith('employee', ['cut', 'brows'])
    );
    expect(saved).toHaveBeenCalled();
  });
  it('permite destildar todos los servicios sin borrar el catálogo', async () => {
    render(
      <MemoryRouter>
        <BarberServicesPanel employeeId="employee" onSaved={vi.fn()} />
      </MemoryRouter>
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: /Corte/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar servicios del barbero' }));
    await waitFor(() => expect(assignBarberServices).toHaveBeenCalledWith('employee', []));
  });
  it('si el catálogo está vacío solicita crear los servicios antes de asignar', async () => {
    vi.mocked(loadBarberCatalog).mockResolvedValue({ catalog: [], assigned: [] });
    render(
      <MemoryRouter>
        <BarberServicesPanel employeeId="employee" onSaved={vi.fn()} />
      </MemoryRouter>
    );
    expect(await screen.findByRole('link', { name: 'Crear servicios' })).toHaveAttribute(
      'href',
      '/admin/servicios'
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('solicita asignar sucursal antes de habilitar servicios al barbero', async () => {
    vi.mocked(loadBarberCatalog).mockResolvedValue({
      catalog: [],
      assigned: [],
      branchId: null,
      branchName: null,
    });
    const choose = vi.fn();
    render(
      <MemoryRouter>
        <BarberServicesPanel employeeId="employee" onSaved={vi.fn()} onChooseBranch={choose} />
      </MemoryRouter>
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Elegir sucursal del barbero' })
    );
    expect(choose).toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('para registrar trabajos ofrece solo servicios activos y asignados', async () => {
    render(<RecordServiceForm employeeId="employee" onSaved={vi.fn()} onAssign={vi.fn()} />);
    const select = await screen.findByLabelText('Servicio del catálogo');
    expect(screen.getByRole('option', { name: 'Corte' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Color' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Servicio inactivo' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'cut');
    expect(screen.getByLabelText('Importe del servicio (ARS)')).toHaveValue('20000.00');
  });
  it('conserva las casillas de otras páginas al guardar servicios', async () => {
    const options = Array.from({ length: 23 }, (_, index) =>
      item(`service-${index}`, `Opción ${index}`)
    );
    vi.mocked(loadBarberCatalog).mockResolvedValue({ catalog: options, assigned: ['service-0'] });
    render(
      <MemoryRouter>
        <BarberServicesPanel employeeId="employee" onSaved={vi.fn()} />
      </MemoryRouter>
    );
    await screen.findByRole('checkbox', { name: /Opción 0\b/ });
    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
    await userEvent.click(screen.getByRole('checkbox', { name: /Opción 1\b/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await userEvent.click(screen.getByRole('checkbox', { name: /Opción 21\b/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByRole('checkbox', { name: /Opción 1\b/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar servicios del barbero' }));
    await waitFor(() =>
      expect(assignBarberServices).toHaveBeenCalledWith('employee', [
        'service-0',
        'service-1',
        'service-21',
      ])
    );
  });
});
