import { requireSupabaseClient } from '../../../integrations/supabase/client';
import { weeklyTotals, type WeeklyBarber } from './model';
export async function loadTeamWeek(start: string, branchId: string): Promise<WeeklyBarber[]> {
  const { data, error } = await requireSupabaseClient().rpc('get_team_weekly_stats', {
    week_start: start,
    selected_branch: branchId || undefined,
  });
  if (error) throw new Error('No se pudo cargar el desempeño semanal. Intentá nuevamente.');
  const rows = data ?? [];
  if (rows.length >= 1000)
    throw new Error(
      'El equipo supera el límite del resumen. Se necesita paginación; no se muestran totales parciales.'
    );
  if (
    rows.some(row =>
      [row.revenue_cents, row.commission_cents, row.service_count].some(
        value => !Number.isSafeInteger(value) || value < 0
      )
    )
  )
    throw new Error('Los importes del resumen están fuera del rango permitido.');
  weeklyTotals(rows);
  return rows;
}
