import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { EmployeeRecord } from '../model/types';
import { periodBounds } from '../model/period';

export async function loadEmployee(id: string, month: string): Promise<EmployeeRecord> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error('ID de empleado inválido.');
  const client = requireSupabaseClient();
  periodBounds(month);
  const results = await Promise.all([
    client
      .from('profiles')
      .select('id, username, full_name, phone, role, created_at, branch_id, branches(name)')
      .eq('id', id)
      .maybeSingle(),
    client.from('employee_details').select('*').eq('employee_id', id).maybeSingle(),
    client
      .from('employee_compensation')
      .select('*')
      .eq('employee_id', id)
      .lte('effective_from', `${month}-01`)
      .order('effective_from', { ascending: false })
      .limit(1),
    client.rpc('get_employee_month_summary', { target_employee: id, month_start: `${month}-01` }),
  ]);
  const [profile, details, compensation, summary] = results;
  if (results.some(result => result.error))
    throw new Error('No se pudo cargar la ficha del empleado. Intentá nuevamente.');
  if (
    !profile.data ||
    !details.data ||
    (profile.data.role !== 'barber' && profile.data.role !== 'reception')
  )
    throw new Error('El empleado no existe o no tenés acceso a su ficha.');
  if (
    !summary.data ||
    typeof summary.data !== 'object' ||
    Array.isArray(summary.data) ||
    Object.values(summary.data).some(
      value => typeof value !== 'number' || !Number.isSafeInteger(value)
    )
  )
    throw new Error('El resumen del empleado está fuera del rango permitido.');
  return {
    profile: {
      ...profile.data,
      role: profile.data.role,
      branch_name: profile.data.branches?.name ?? null,
    },
    details: details.data,
    compensation: compensation.data ?? [],
    services: [],
    adjustments: [],
    audit: [],
    period: month,
    version: Date.now(),
    summary: summary.data as unknown as NonNullable<EmployeeRecord['summary']>,
  };
}
