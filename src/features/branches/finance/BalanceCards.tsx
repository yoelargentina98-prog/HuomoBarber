import { money } from '../../employees/model/money';
import type { BranchBalance } from './service';
export function BalanceCards({ rows }: { rows: BranchBalance[] }) {
  const income = rows.reduce((sum, row) => sum + row.income_cents, 0);
  const expense = rows.reduce((sum, row) => sum + row.expense_cents, 0);
  const commission = rows.reduce((sum, row) => sum + row.commission_cents, 0);
  const balance = income - expense - commission;
  if (![income, expense, commission, balance].every(Number.isSafeInteger))
    return <p role="alert">Los totales superan el rango permitido.</p>;
  return (
    <div className="branch-finance-totals">
      <article>
        <span>Ingresos cobrados</span>
        <strong>{money(income)}</strong>
      </article>
      <article>
        <span>Gastos manuales</span>
        <strong>{money(expense)}</strong>
      </article>
      <article>
        <span>Comisiones generadas</span>
        <strong>{money(commission)}</strong>
      </article>
      <article className={balance < 0 ? 'negative' : ''}>
        <span>Saldo operativo estimado</span>
        <strong>{money(balance)}</strong>
      </article>
    </div>
  );
}
