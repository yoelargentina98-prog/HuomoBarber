import { loadPage } from '../../../shared/lib/pages';
import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type { Database, Tables } from '../../../integrations/supabase/types';
import { periodBounds } from '../../employees/model/period';
export type BranchBalance =
  Database['public']['Functions']['get_branch_balances']['Returns'][number];
export type BranchExpense = Tables<'branch_expenses'>;
export const expenseCategories = {
  electricity: 'Luz',
  water: 'Agua',
  rent: 'Alquiler',
  gas: 'Gas',
  internet: 'Internet',
  supplies: 'Insumos',
  maintenance: 'Mantenimiento',
  taxes: 'Impuestos',
  payroll: 'Fijos y otros sueldos (sin comisiones)',
  commission_payment: 'Pago de comisiones (costo ya contemplado)',
  other: 'Otros',
} as const;
export async function loadBranchBalances(month: string): Promise<BranchBalance[]> {
  periodBounds(month);
  const { data, error } = await requireSupabaseClient().rpc('get_branch_balances', {
    month_start: `${month}-01`,
  });
  if (error) throw new Error('No se pudo cargar el balance de sucursales.');
  if ((data?.length ?? 0) >= 1000)
    throw new Error('Se necesita paginación para mostrar todas las sucursales.');
  for (const row of data ?? [])
    if (
      [
        row.income_cents,
        row.expense_cents,
        row.commission_cents,
        row.total_cost_cents,
        row.balance_cents,
        row.payment_count,
      ].some(value => !Number.isSafeInteger(value))
    )
      throw new Error('Los importes superan el rango permitido.');
  return data ?? [];
}
export type BranchCommission =
  Database['public']['Functions']['get_branch_commissions']['Returns'][number];
export async function loadBranchCommissions(
  branch: string,
  month: string
): Promise<BranchCommission[]> {
  periodBounds(month);
  return (
    await loadPage<BranchCommission>({
      resource: 'branch_commissions',
      filters: { branch, month: `${month}-01` },
    })
  ).rows;
}
export async function loadBranchExpenses(branch: string, month: string): Promise<BranchExpense[]> {
  periodBounds(month);
  return (
    await loadPage<BranchExpense>({
      resource: 'branch_expenses',
      filters: { branch, month: `${month}-01` },
    })
  ).rows;
}

export type ExpenseInput = {
  category: string;
  description: string;
  amount: number;
  date: string;
  method: string;
  notes: string;
};
export async function saveExpense(
  branch: string,
  operation: string,
  input: ExpenseInput
): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('record_branch_expense', {
    target_branch: branch,
    request_id: operation,
    expense_category: input.category,
    expense_description: input.description,
    expense_cents: input.amount,
    expense_date: input.date,
    payment_method: input.method,
    expense_notes: input.notes,
  });
  if (error) throw new Error(error.message);
}
export async function voidExpense(id: string, reason: string): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('void_branch_expense', {
    target_expense: id,
    reason,
  });
  if (error) throw new Error(error.message);
}
