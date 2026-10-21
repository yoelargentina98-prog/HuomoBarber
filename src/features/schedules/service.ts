import { requireSupabaseClient } from '../../integrations/supabase/client';
import { emptySchedule, validateSchedule, type Schedule } from './model';
import type { Json } from '../../integrations/supabase/types';

export async function loadSchedule(employeeId: string): Promise<Schedule> {
  const { data, error } = await requireSupabaseClient()
    .from('barber_schedules')
    .select('weekly, exceptions, revision')
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw new Error('No se pudieron cargar los horarios. Reintentá antes de editar.');
  if (!data) return emptySchedule();
  return {
    weekly: data.weekly as unknown as Schedule['weekly'],
    exceptions: data.exceptions as unknown as Schedule['exceptions'],
    revision: data.revision,
  };
}
export async function saveSchedule(employeeId: string, schedule: Schedule): Promise<void> {
  validateSchedule(schedule);
  const { error } = await requireSupabaseClient().rpc('save_barber_schedule', {
    target_employee: employeeId,
    weekly_hours: schedule.weekly as unknown as Json,
    date_exceptions: schedule.exceptions as unknown as Json,
    expected_revision: schedule.revision,
  });
  if (error) throw new Error(error.message);
}
