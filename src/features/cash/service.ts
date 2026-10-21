import { requireSupabaseClient } from '../../integrations/supabase/client';
import { dayBounds, type CashDay } from './model';
export async function loadCashDay(day: string, branch: string): Promise<CashDay> {
  dayBounds(day);
  const { data, error } = await requireSupabaseClient().rpc('get_cash_day_summary', {
    service_day: day,
    selected_branch: branch || undefined,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('No se pudo cargar el resumen de Caja.');
  const summary = data as unknown as NonNullable<CashDay['summary']>;
  if (
    ['cash', 'transfer', 'cashCount', 'transferCount', 'voided', 'total', 'pendingCount'].some(
      key =>
        !Number.isSafeInteger(summary[key as keyof typeof summary]) ||
        summary[key as keyof typeof summary] < 0
    )
  )
    throw new Error('Los totales de Caja superan el rango permitido.');
  return { payments: [], pending: [], summary, paginated: true };
}

export async function collectPayment(input: {
  serviceId: string;
  method: string;
  paidAt: string;
  requestId: string;
  reference: string;
  notes: string;
}): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('collect_service_payment', {
    target_service: input.serviceId,
    payment_method: input.method,
    payment_at: `${input.paidAt}-03:00`,
    operation_id: input.requestId,
    payment_reference: input.reference.trim(),
    payment_notes: input.notes.trim(),
  });
  if (error) throw new Error(error.message);
}
export async function voidPayment(id: string, reason: string): Promise<void> {
  const { error } = await requireSupabaseClient().rpc('void_cash_payment', {
    target_payment: id,
    reason,
  });
  if (error) throw new Error(error.message);
}
