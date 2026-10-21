import type { Tables, Database } from '../../integrations/supabase/types';
export type Payment = Tables<'cash_payments'>;
export type PendingService =
  Database['public']['Functions']['get_pending_cash_services']['Returns'][number];
export type CashDay = {
  payments: Payment[];
  pending: PendingService[];
  summary?: ReturnType<typeof cashSummary> & { pendingCount: number };
  paginated?: boolean;
};
export const paymentMethods = { cash: 'Efectivo', transfer: 'Transferencia' } as const;
export function dayBounds(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Fecha inválida.');
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { from: `${day}T00:00:00-03:00`, to: `${next.toISOString().slice(0, 10)}T00:00:00-03:00` };
}
export function cashSummary(payments: Payment[]) {
  const summary = { cash: 0, transfer: 0, cashCount: 0, transferCount: 0, voided: 0, total: 0 };
  for (const payment of payments) {
    if (payment.voided_at) {
      summary.voided++;
      continue;
    }
    if (payment.method !== 'cash' && payment.method !== 'transfer')
      throw new Error('Medio de pago desconocido.');
    summary[payment.method] += payment.amount_cents;
    summary[payment.method === 'cash' ? 'cashCount' : 'transferCount']++;
    summary.total += payment.amount_cents;
    if (!Number.isSafeInteger(summary.total) || payment.amount_cents <= 0)
      throw new Error('Los importes superan el rango permitido.');
  }
  return summary;
}
export function localNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}
