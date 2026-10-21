import { loadPage } from '../../../shared/lib/pages';
import { requireSupabaseClient } from '../../../integrations/supabase/client';
import {
  parseStaffInput,
  type StaffInput,
} from '../../../../supabase/functions/_shared/staff-input';

export type { StaffInput };
export interface StaffMember {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  role: 'barber' | 'reception';
  created_at: string;
  branch_id?: string | null;
  branch_name?: string | null;
}

export async function listStaff(): Promise<StaffMember[]> {
  const { rows } = await loadPage<StaffMember>({ resource: 'staff', filters: {} });
  return rows;
}
export async function loadStaffCounts() {
  const client = requireSupabaseClient();
  const results = await Promise.all(
    ['barber', 'reception'].map(role =>
      client
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .eq('role', role as 'barber' | 'reception')
    )
  );
  if (results.some(result => result.error)) throw new Error('No se pudo contar el equipo.');
  return { barber: results[0]?.count ?? 0, reception: results[1]?.count ?? 0 };
}

export async function createStaff(value: StaffInput): Promise<StaffMember> {
  const input = parseStaffInput(value);
  const { data, error } = await requireSupabaseClient().functions.invoke('create-staff', {
    body: input,
  });
  if (error) {
    let message =
      'No se pudo crear el empleado. Verificá la sesión, la conexión y el despliegue de create-staff.';
    if (error.context instanceof Response) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }
  if (!data?.staff) throw new Error('Respuesta incompleta. Revisá el listado antes de reintentar.');
  return data.staff as StaffMember;
}
