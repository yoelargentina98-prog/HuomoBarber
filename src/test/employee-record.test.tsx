import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { EmployeePage } from '../features/employees/pages/EmployeePage';
import { StaffList } from '../features/staff/components/StaffList';
import { StaffContext } from '../features/staff/hooks/staff-context';
import { loadEmployee } from '../features/employees/services/employee-read';
import type { EmployeeRecord } from '../features/employees/model/types';
import { loadBarberCatalog } from '../features/catalog/services/catalog-service';

vi.mock('../features/employees/services/employee-read', () => ({ loadEmployee: vi.fn() }));
vi.mock('../features/catalog/services/catalog-service', () => ({
  loadBarberCatalog: vi.fn(),
  assignBarberServices: vi.fn(),
}));
const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'barbero',
  full_name: 'Barbero de prueba',
  role: 'barber' as const,
  phone: null,
  created_at: '',
};
const record: EmployeeRecord = {
  profile,
  details: {
    employee_id: profile.id,
    employee_number: 1,
    active: true,
    hire_date: '2026-10-01',
    notes: '',
    created_at: '',
  },
  compensation: [],
  services: [],
  adjustments: [],
  audit: [],
};
function renderRecord() {
  return render(
    <MemoryRouter initialEntries={[`/admin/personal/${profile.id}`]}>
      <StaffContext
        value={{
          members: [profile],
          loading: false,
          error: '',
          refresh: vi.fn(),
          addMember: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/admin/personal/:employeeId" element={<EmployeePage />} />
        </Routes>
      </StaffContext>
    </MemoryRouter>
  );
}
describe('Ficha del empleado', () => {
  beforeEach(() => {
    vi.mocked(loadEmployee).mockResolvedValue(record);
    vi.mocked(loadBarberCatalog).mockResolvedValue({
      catalog: [
        {
          id: 'service-1',
          name: 'Corte',
          category: 'cut',
          description: '',
          active: true,
          price_cents: 2000000,
          duration_minutes: 30,
          created_at: '',
          updated_at: '',
        },
      ],
      assigned: ['service-1'],
    });
  });
  it('permite abrir la ficha desde el nombre del empleado', () => {
    render(
      <MemoryRouter>
        <StaffList members={[profile]} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Barbero de prueba/ })).toHaveAttribute(
      'href',
      `/admin/personal/${profile.id}`
    );
  });
  it('presenta ID y datos reales, y permite navegar a remuneración', async () => {
    renderRecord();
    expect(await screen.findByRole('heading', { name: 'Empleado #0001' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Barbero de prueba' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remuneración' }));
    expect(screen.getByLabelText('Fijo mensual (ARS)')).toBeInTheDocument();
    expect(screen.getByLabelText('Comisión por servicio (%)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Comisión por barba (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comisión por corte (%)')).not.toBeInTheDocument();
  });
  it('ofrece registro de servicios y movimientos, sin datos ficticios', async () => {
    renderRecord();
    await screen.findByRole('heading', { name: 'Empleado #0001' });
    await userEvent.click(screen.getByRole('button', { name: 'Servicios' }));
    expect(screen.getByText('No hay servicios registrados en este mes.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar servicio' }));
    expect(await screen.findByLabelText('Servicio del catálogo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Extras y bonos' }));
    expect(screen.getByLabelText('Concepto')).toBeInTheDocument();
  });
  it('muestra un error recuperable si falla la consulta', async () => {
    vi.mocked(loadEmployee).mockRejectedValue(new Error('Error de prueba'));
    renderRecord();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de prueba');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
