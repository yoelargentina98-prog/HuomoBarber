import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { TablesInsert } from '../../../integrations/supabase/types';
import type { MovementKind } from '../model/types';

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function saveCompensation(
  value: TablesInsert<'employee_compensation'>
): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('employee_compensation')
    .upsert(value, { onConflict: 'employee_id,effective_from' });
  fail(error);
}
export async function savePersonal(
  id: string,
  fullName: string,
  phone: string,
  hireDate: string,
  notes: string
): Promise<void> {
  if (fullName.trim().length < 2 || fullName.length > 100)
    throw new Error('El nombre debe tener entre 2 y 100 caracteres.');
  const { error } = await requireSupabaseClient().rpc('save_employee_personal', {
    target_employee: id,
    employee_name: fullName.trim(),
    employee_phone: phone.trim(),
    start_date: hireDate,
    employee_notes: notes,
  });
  fail(error);
}
export async function recordService(
  id: string,
  catalogId: string,
  at: string,
  amount: number,
  notes: string
): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('record_catalog_service', {
    target_employee: id,
    catalog_service: catalogId,
    service_at: at,
    charged_cents: amount,
    service_notes: notes,
  });
  fail(error);
}
export async function recordAdjustment(
  id: string,
  month: string,
  kind: MovementKind,
  amount: number,
  description: string
): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error('El importe del movimiento debe ser mayor que cero.');
  const { error } = await requireSupabaseClient().rpc('record_employee_adjustment', {
    target_employee: id,
    target_period: `${month}-01`,
    movement_kind: kind,
    movement_cents: amount,
    movement_description: description,
  });
  fail(error);
}
export async function voidEntry(
  type: 'service' | 'adjustment',
  id: string,
  reason: string
): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('void_employee_entry', {
    entry_type: type,
    entry_id: id,
    reason,
  });
  fail(error);
}
export async function setEmployeeActive(id: string, active: boolean): Promise<void> {
  const { data, error } = await requireSupabaseClient().functions.invoke('update-staff', {
    body: { employee_id: id, active },
  });
  if (error || !data?.ok)
    throw new Error(
      data?.error ??
        'No se pudo cambiar el estado del empleado. Actualizá la ficha antes de reintentar.'
    );
}
