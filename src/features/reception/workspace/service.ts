import { loadPage } from '../../../shared/lib/pages';
import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Database } from '../../../integrations/supabase/types';
export type ReceptionEmployee =
  Database['public']['Functions']['get_reception_team']['Returns'][number];
export async function loadReceptionTeam(branch: string): Promise<ReceptionEmployee[]> {
  return (await loadPage<ReceptionEmployee>({ resource: 'reception_team', filters: { branch } }))
    .rows;
}
export async function loadReceptionTeamCount(branch: string): Promise<number> {
  const { data, error } = await requireSupabaseClient().rpc('get_reception_team_count', {
    target_branch: branch,
  });
  if (error || !Number.isSafeInteger(data)) throw new Error('No se pudo contar el equipo.');
  return data ?? 0;
}
