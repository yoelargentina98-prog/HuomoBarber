import { money } from '../../features/employees/model/money';

export function formatCurrency(cents: number): string {
  return money(cents);
}
