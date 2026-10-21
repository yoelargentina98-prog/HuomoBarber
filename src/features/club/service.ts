import { requireSupabaseClient } from '../../integrations/supabase/client';
export type ClubClient = { id: string; full_name: string; customer_number: string };
export type ClubHistory = {
  rows: {
    id: string;
    service_name: string;
    branch_name: string;
    barber_name: string;
    performed_at: string;
    amount_cents: number;
  }[];
  total: number;
  summary: { services: number; spentCents: number; lastVisit: string | null; visitDays: number };
};
export async function lookupClient(number: string, branch: string): Promise<ClubClient> {
  if (!/^\d{5,15}$/.test(number))
    throw new Error('Ingresá el número de cliente, sin letras ni espacios.');
  const { data, error } = await requireSupabaseClient().rpc('lookup_club_client', {
    client_number: number,
    target_branch: branch,
  });
  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error('No existe un cliente con ese número.');
  return data[0];
}
export async function clubHistory(
  page: number,
  client?: string,
  branch?: string
): Promise<ClubHistory> {
  const { data, error } = await requireSupabaseClient().rpc('get_club_history', {
    page_number: page,
    target_client: client,
    target_branch: branch,
  });
  if (error || !data) throw new Error('No se pudo cargar el historial.');
  return data as unknown as ClubHistory;
}
