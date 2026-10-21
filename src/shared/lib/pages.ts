import { requireSupabaseClient } from '../../integrations/supabase/client';
import type { Json } from '../../integrations/supabase/types';

export type PageSource = {
  resource: string;
  filters: Record<string, string>;
  revision?: string | number;
};
export type DataPage<T> = { rows: T[]; total: number; page: number };
export async function loadPage<T>(source: PageSource, page = 0, size = 20): Promise<DataPage<T>> {
  const { data, error } = await requireSupabaseClient().rpc('get_management_page', {
    resource: source.resource,
    filters: source.filters,
    page_number: page,
    page_size: size,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Respuesta de paginación inválida.');
  const result = data as Record<string, Json | undefined>;
  if (
    !Array.isArray(result.rows) ||
    !Number.isSafeInteger(result.total) ||
    !Number.isSafeInteger(result.page)
  )
    throw new Error('Respuesta de paginación incompleta.');
  return { rows: result.rows as T[], total: result.total as number, page: result.page as number };
}
