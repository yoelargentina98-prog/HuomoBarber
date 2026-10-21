import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Tables } from '../../../integrations/supabase/types';
export type Branch = Tables<'branches'>;
export type BranchPrice = Tables<'branch_services'>;
export async function listBranches(): Promise<Branch[]> {
  const { data, error } = await requireSupabaseClient()
    .from('branches')
    .select('*')
    .order('created_at')
    .limit(501);
  if (error) throw new Error('No se pudieron cargar las sucursales.');
  if ((data?.length ?? 0) > 500)
    throw new Error('Se necesita paginación para mostrar todas las sucursales.');
  return data ?? [];
}
export async function saveBranch(
  value: Pick<Branch, 'name' | 'address' | 'phone'>,
  id?: string
): Promise<void> {
  const client = requireSupabaseClient();
  const input = {
    name: value.name.trim(),
    address: value.address.trim(),
    phone: value.phone.trim(),
  };
  const result = id
    ? await client.from('branches').update(input).eq('id', id).select('id').single()
    : await client.from('branches').insert(input).select('id').single();
  if (result.error?.code === '23505') throw new Error('Ya existe una sucursal con ese nombre.');
  if (result.error) throw new Error('No se pudo guardar la sucursal.');
}
export async function setBranchActive(id: string, active: boolean): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('branches')
    .update({ active })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error('No se pudo cambiar el estado de la sucursal.');
}
export async function saveEmployeeBranch(employeeId: string, branchId: string): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('save_employee_branch', {
    target_employee: employeeId,
    target_branch: branchId,
  });
  if (error) throw new Error(error.message);
}
export async function loadBranchPrices(serviceId: string): Promise<BranchPrice[]> {
  const { data, error } = await requireSupabaseClient()
    .from('branch_services')
    .select('*')
    .eq('service_id', serviceId);
  if (error) throw new Error('No se pudieron cargar los precios por sucursal.');
  return data ?? [];
}
export async function saveBranchPrices(
  serviceId: string,
  prices: { branch_id: string; price_cents: number | null; active: boolean }[]
): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('save_service_branch_prices', {
    target_service: serviceId,
    prices,
  });
  if (error)
    throw new Error(
      'No se guardaron los precios. Cada servicio disponible debe tener un precio y una sucursal activa.'
    );
}
