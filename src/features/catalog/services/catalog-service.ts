import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Tables } from '../../../integrations/supabase/types';
export type CatalogService = Tables<'service_catalog'>;
export type CatalogInput = Pick<
  CatalogService,
  'name' | 'description' | 'category' | 'duration_minutes'
>;

export async function listCatalog(firstPageOnly = false): Promise<CatalogService[]> {
  const { data, error } = await requireSupabaseClient()
    .from('service_catalog')
    .select('*')
    .order('name')
    .limit(firstPageOnly ? 20 : 501);
  if (error) throw new Error('No se pudo cargar el catálogo de servicios.');
  if (!firstPageOnly && (data?.length ?? 0) > 500)
    throw new Error(
      'El catálogo supera el límite de esta vista. Se necesita ampliar la paginación.'
    );
  return data ?? [];
}
export async function saveCatalog(input: CatalogInput, id?: string): Promise<void> {
  const client = requireSupabaseClient();
  const value = { ...input, name: input.name.trim(), description: input.description.trim() };
  const result = id
    ? await client.from('service_catalog').update(value).eq('id', id).select('id').single()
    : await client.from('service_catalog').insert(value).select('id').single();
  if (result.error?.code === '23505')
    throw new Error('Ya existe un servicio con ese nombre. Revisá también los inactivos.');
  if (result.error)
    throw new Error('No se pudo guardar el servicio. Revisá los datos e intentá nuevamente.');
}
export async function setCatalogActive(id: string, active: boolean): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('service_catalog')
    .update({ active })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error('No se pudo actualizar el estado del servicio.');
}
export async function loadBarberCatalog(employeeId: string): Promise<{
  catalog: CatalogService[];
  assigned: string[];
  branchId?: string | null;
  branchName?: string | null;
}> {
  const client = requireSupabaseClient();
  const [catalog, links, profile] = await Promise.all([
    listCatalog(),
    requireSupabaseClient()
      .from('barber_services')
      .select('service_id')
      .eq('employee_id', employeeId),
    client
      .from('profiles')
      .select('branch_id, branches(name,active)')
      .eq('id', employeeId)
      .single(),
  ]);
  if (links.error || profile.error)
    throw new Error('No se pudieron cargar los servicios y la sucursal del barbero.');
  const branchId = profile.data.branch_id;
  if (!branchId) return { catalog: [], assigned: [], branchId: null, branchName: null };
  const prices = await client.from('branch_services').select('*').eq('branch_id', branchId);
  if (prices.error) throw new Error('No se pudieron cargar los precios de la sucursal.');
  const assigned = (links.data ?? []).map(item => item.service_id);
  return {
    catalog: catalog
      .filter(
        service =>
          prices.data.some(price => price.service_id === service.id) ||
          assigned.includes(service.id)
      )
      .map(service => {
        const price = prices.data.find(item => item.service_id === service.id);
        return {
          ...service,
          price_cents: price?.price_cents ?? 0,
          active:
            service.active &&
            !!price?.active &&
            price.price_cents != null &&
            !!profile.data.branches?.active,
        };
      }),
    assigned,
    branchId,
    branchName: profile.data.branches?.name ?? null,
  };
}
export async function assignBarberServices(employeeId: string, ids: string[]): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('set_barber_services', {
    target_employee: employeeId,
    service_ids: ids,
  });
  if (error) throw new Error(error.message);
}
