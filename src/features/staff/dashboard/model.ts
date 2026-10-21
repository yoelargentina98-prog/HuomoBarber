import { today } from '../../employees/model/period';
export type WeeklyBarber = {
  employee_id: string;
  full_name: string | null;
  username: string | null;
  service_count: number;
  revenue_cents: number;
  commission_cents: number;
};
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekStart(date = today()): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -(day === 0 ? 6 : day - 1));
}
export function weekLabel(start: string): string {
  const format = (date: string) =>
    new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  return `${format(start)} — ${format(shiftDate(start, 6))}`;
}
export function barberName(row: WeeklyBarber): string {
  return row.full_name || row.username || 'Barbero sin nombre';
}
export function leaders(
  rows: WeeklyBarber[],
  key: 'revenue_cents' | 'service_count' | 'commission_cents'
): WeeklyBarber[] {
  const max = Math.max(0, ...rows.map(row => row[key]));
  return max > 0 ? rows.filter(row => row[key] === max) : [];
}
export function weeklyTotals(rows: WeeklyBarber[]) {
  return rows.reduce(
    (sum, row) => {
      const result = {
        services: sum.services + row.service_count,
        revenue: sum.revenue + row.revenue_cents,
        commission: sum.commission + row.commission_cents,
      };
      if (Object.values(result).some(value => !Number.isSafeInteger(value)))
        throw new Error('Los totales superan el rango permitido.');
      return result;
    },
    { services: 0, revenue: 0, commission: 0 }
  );
}
