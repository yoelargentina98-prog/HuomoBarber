import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ActivityPanel } from '../features/employees/components/ActivityPanel';

it('muestra solo la comisión general aunque la auditoría conserve campos antiguos', () => {
  render(
    <ActivityPanel
      audit={[
        {
          id: 1,
          employee_id: 'barber',
          actor_id: 'admin',
          entity: 'employee_compensation',
          action: 'INSERT',
          created_at: '2026-10-21T12:00:00Z',
          before_data: null,
          after_data: {
            commission_percent: 30,
            cut_percent: null,
            beard_percent: 50,
            other_percent: null,
            monthly_fixed_cents: 25000000,
            effective_from: '2026-10-01',
          },
        },
      ]}
    />
  );
  expect(screen.getByText('Comisión por servicio: 30%')).toBeInTheDocument();
  expect(screen.getByText(/Fijo mensual:/)).toBeInTheDocument();
  expect(screen.getByText('Vigencia: 2026-10-01')).toBeInTheDocument();
  expect(
    screen.queryByText(/Comisión por corte|Comisión por barba|Comisión por otros/)
  ).not.toBeInTheDocument();
});
