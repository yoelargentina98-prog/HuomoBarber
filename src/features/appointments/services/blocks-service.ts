import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Database, Tables } from '../../../integrations/supabase/types';
export type BookingBlock = Tables<'booking_blocks'>;
export async function loadBlocks(branch: string, page: number) {
  const { data, error, count } = await requireSupabaseClient()
    .from('booking_blocks')
    .select('*', { count: 'exact' })
    .eq('branch_id', branch)
    .is('removed_at', null)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')
    .order('id')
    .range(page * 20, page * 20 + 19);
  if (error) throw new Error('No se pudieron cargar los bloqueos.');
  return { rows: data ?? [], total: count ?? 0 };
}
export async function loadBlockBarbers(branch: string) {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .select('id,full_name,username')
    .eq('branch_id', branch)
    .eq('role', 'barber')
    .order('full_name')
    .limit(501);
  if (error || (data?.length ?? 0) > 500)
    throw new Error('No se pudo cargar el selector de barberos.');
  return data ?? [];
}
export async function saveBlock(branch: string, data: FormData) {
  const start = String(data.get('start') ?? '');
  const end = String(data.get('end') ?? '');
  if (!start || !end) throw new Error('Indicá inicio y fin.');
  // SQL accepts null for a branch-wide block; generated RPC arguments omit SQL nullability.
  const args = {
    target_branch: branch,
    target_barber: String(data.get('barber') ?? '') || null,
    block_start: `${start}-03:00`,
    block_end: `${end}-03:00`,
    block_reason: String(data.get('reason') ?? '').trim(),
  };
  const { error } = await requireSupabaseClient().rpc(
    'save_booking_block',
    args as Database['public']['Functions']['save_booking_block']['Args']
  );
  if (error) throw new Error(error.message);
}
export async function removeBlock(id: string) {
  const { error } = await requireSupabaseClient().rpc('remove_booking_block', { target_block: id });
  if (error) throw new Error(error.message);
}
