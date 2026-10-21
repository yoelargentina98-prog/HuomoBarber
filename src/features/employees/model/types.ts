import type { Tables } from '../../../integrations/supabase/types';
import type { StaffMember } from '../../staff/services/staff-service';

export type Compensation = Tables<'employee_compensation'>;
export type ServiceRecord = Tables<'employee_services'>;
export type Adjustment = Tables<'employee_adjustments'>;
export type EmployeeDetails = Tables<'employee_details'>;
export type AuditEvent = Tables<'employee_audit'>;
export interface EmployeeRecord {
  period?: string;
  version?: number;
  summary?: ReturnType<typeof import('./summary').summarize>;
  profile: StaffMember;
  details: EmployeeDetails;
  compensation: Compensation[];
  services: ServiceRecord[];
  adjustments: Adjustment[];
  audit: AuditEvent[];
}
export const SERVICE_CATEGORIES = { cut: 'Corte', beard: 'Barba', other: 'Otro servicio' } as const;
export const MOVEMENT_KINDS = { extra: 'Extra', bonus: 'Bono', deduction: 'Descuento' } as const;
export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;
export type MovementKind = keyof typeof MOVEMENT_KINDS;
