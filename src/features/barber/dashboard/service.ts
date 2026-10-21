import { requireSupabaseClient } from '../../../integrations/supabase/client';
export type BarberDashboardData = {
  weekStart: string;
  count: number;
  revenue: number;
  commission: number;
  fixedMonth: string;
  fixed: number | null;
  services: {
    key: string;
    name: string;
    assigned: boolean;
    active: boolean;
    count: number;
    revenue: number;
    commission: number;
  }[];
  days: { date: string; count: number; commission: number }[];
  recent: {
    id: string;
    service_name: string;
    performed_at: string;
    amount_cents: number;
    commission_cents: number;
    branch_name: string | null;
  }[];
};
function checkNumbers(value: unknown): void {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0))
    throw new Error('Los importes superan el rango permitido.');
  if (Array.isArray(value)) value.forEach(checkNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkNumbers);
}
export async function loadBarberDashboard(week: string): Promise<BarberDashboardData> {
  const { data, error } = await requireSupabaseClient().rpc('get_barber_dashboard', {
    week_start: week,
  });
  if (error)
    throw new Error('No se pudo cargar tu resumen. Reintentá para ver los datos actualizados.');
  if (!data) throw new Error('No se recibió el resumen.');
  checkNumbers(data);
  return data as unknown as BarberDashboardData;
}
export type BarberHistory = { total: number; items: BarberDashboardData['recent'] };
export async function loadBarberHistory(week: string, page: number): Promise<BarberHistory> {
  const { data, error } = await requireSupabaseClient().rpc('get_barber_service_history', {
    week_start: week,
    page_number: page,
  });
  if (error || !data)
    throw new Error('No se pudo cargar tu historial. Reintentá sin cambiar de sesión.');
  checkNumbers(data);
  return data as unknown as BarberHistory;
}
