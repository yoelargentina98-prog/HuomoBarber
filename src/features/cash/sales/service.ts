import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Database } from '../../../integrations/supabase/types';
export type SaleOption =
  Database['public']['Functions']['get_cash_sale_options']['Returns'][number];
export type CashOperator = {
  name?: string | null;
  username?: string | null;
  role: 'admin' | 'reception';
  branchId: string | null;
  branchName: string | null;
};
export async function cashOperator(): Promise<CashOperator | null> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return null;
  const { data, error } = await client.rpc('get_cash_operator');
  if (error) throw new Error(error.message);
  return data as unknown as CashOperator;
}
export async function saleOptions(branch: string): Promise<SaleOption[]> {
  const { data, error } = await requireSupabaseClient().rpc('get_cash_sale_options', {
    target_branch: branch,
  });
  if (error) throw new Error(error.message);
  if ((data?.length ?? 0) >= 1000)
    throw new Error('Se necesita paginación para mostrar todas las opciones.');
  return data ?? [];
}
export type SaleInput = {
  customerNumber?: string;
  branch: string;
  employee: string;
  service: string;
  method: string;
  price: number;
  reference: string;
  notes: string;
};
export type SaleSetup = {
  branchActive: boolean;
  serviceCount: number;
  barbers: { id: string; name: string; active: boolean; enabledCount: number }[];
};
export async function saleSetup(branch: string): Promise<SaleSetup> {
  const { data, error } = await requireSupabaseClient().rpc('get_cash_sale_setup', {
    target_branch: branch,
  });
  if (error || !data) throw new Error('No se pudo verificar la configuración de la sucursal.');
  return data as unknown as SaleSetup;
}
export async function registerSale(input: SaleInput, request: string): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('register_cash_sale', {
    target_branch: input.branch,
    target_employee: input.employee,
    catalog_service: input.service,
    payment_method: input.method,
    expected_cents: input.price,
    operation_id: request,
    payment_reference: input.reference,
    sale_notes: input.notes,
    target_client_number: input.customerNumber ?? '',
  });
  if (error) throw new Error(error.message);
}
