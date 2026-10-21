import type { EmployeeRecord } from '../../features/employees/model/types';
import type { Payment } from '../../features/cash/model';
import type { BranchBalance, BranchExpense } from '../../features/branches/finance/service';

// Local visual fixtures, never sent to Supabase.
export const person = {
  id: 'visual-barber',
  username: 'barbero.de.prueba',
  full_name: 'Alejandro Fernández de la Sucursal Irigoyen',
  phone: '1141453929',
  role: 'barber' as const,
  created_at: '',
  branch_name: 'Irigoyen',
};
export const payment: Payment = {
  id: 'visual-payment',
  request_id: 'visual-request',
  service_id: 'visual-service',
  employee_id: person.id,
  barber_name: person.full_name,
  service_name: 'Corte completo con barba y perfilado de cejas',
  branch_id: 'visual-branch',
  branch_name: 'Irigoyen',
  amount_cents: 12500000,
  method: 'transfer',
  paid_at: '2026-10-21T12:30:00Z',
  recorded_by: 'fixture',
  created_at: '',
  notes: 'Nota de prueba para verificar que el texto se pueda leer completo desde un celular.',
  reference: 'COMPROBANTE-DE-TRANSFERENCIA-CON-REFERENCIA-EXTENSA-123456789',
  voided_at: null,
  void_reason: null,
  voided_by: null,
  sale_payload: null,
};
export const record: EmployeeRecord = {
  profile: person,
  details: {
    employee_id: person.id,
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
export const balances: BranchBalance[] = [
  {
    branch_id: 'visual-branch',
    branch_name: 'Irigoyen',
    active: true,
    income_cents: 125000000,
    expense_cents: 25000000,
    commission_cents: 37500000,
    total_cost_cents: 62500000,
    balance_cents: 62500000,
    payment_count: 40,
  },
];
export const expense: BranchExpense = {
  id: 'visual-expense',
  operation_id: 'visual-operation',
  branch_id: 'visual-branch',
  category: 'rent',
  description: 'Alquiler mensual del local de la sucursal Irigoyen',
  amount_cents: 25000000,
  paid_on: '2026-10-21',
  method: 'transfer',
  notes: 'Registro de prueba visual',
  recorded_by: 'fixture',
  created_at: '',
  voided_at: null,
  voided_by: null,
  void_reason: null,
};
