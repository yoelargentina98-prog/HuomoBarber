import { requireSupabaseClient } from '../../integrations/supabase/client';
import { emptySchedule, validateSchedule, type Schedule } from './model';
import type { Json } from '../../integrations/supabase/types';
export async function loadBranchSchedule(branchId: string): Promise<Schedule> {
  const { data, error } = await requireSupabaseClient()
    .from('branch_schedules')
    .select('weekly,exceptions,revision')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw new Error('No se pudieron cargar los horarios de apertura.');
  return data
    ? {
        weekly: data.weekly as unknown as Schedule['weekly'],
        exceptions: data.exceptions as unknown as Schedule['exceptions'],
        revision: data.revision,
      }
    : emptySchedule();
}
export async function saveBranchSchedule(branchId: string, schedule: Schedule) {
  validateSchedule(schedule);
  const { error } = await requireSupabaseClient().rpc('save_branch_schedule', {
    target_branch: branchId,
    weekly_hours: schedule.weekly as unknown as Json,
    date_exceptions: schedule.exceptions as unknown as Json,
    expected_revision: schedule.revision,
  });
  if (error) throw new Error(error.message);
}
