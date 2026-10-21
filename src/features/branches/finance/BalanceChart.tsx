import { Paginated } from '../../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import { money } from '../../employees/model/money';
import type { BranchBalance } from './service';
export function BalanceChart({ rows }: { rows: BranchBalance[] }) {
  const max = Math.max(
    1,
    ...rows.flatMap(row => [
      row.income_cents,
      row.expense_cents,
      row.commission_cents,
      Math.abs(row.balance_cents),
    ])
  );
  return (
    <Paginated items={rows}>
      {pageRows => (
        <figure className="branch-balance-chart">
          <figcaption>Ingresos, gastos y saldo por sucursal</figcaption>
          <p className="employee-help">
            Una misma escala para todas las sucursales. Los saldos negativos se muestran a la
            izquierda del cero.
          </p>
          {pageRows.map(row => (
            <div className="branch-chart-group" key={row.branch_id}>
              <div className="section-heading">
                <Link to={`/sucursal/${row.branch_id}`}>{row.branch_name} →</Link>
                {!row.active && <small>Inactiva</small>}
              </div>
              {[
                { key: 'income', label: 'Ingresos', value: row.income_cents },
                { key: 'expense', label: 'Gastos manuales', value: row.expense_cents },
                { key: 'commission', label: 'Comisiones', value: row.commission_cents },
                { key: 'balance', label: 'Saldo', value: row.balance_cents },
              ].map(item => (
                <div className="branch-chart-row" key={item.key}>
                  <span>{item.label}</span>
                  <div className="branch-chart-track" aria-hidden="true">
                    <i
                      style={{
                        width: `${(Math.abs(item.value) / max) * 50}%`,
                        ...(item.value < 0 ? { right: '50%' } : { left: '50%' }),
                      }}
                      className={`${item.key} ${item.value < 0 ? 'negative' : ''}`}
                    />
                  </div>
                  <strong>{money(item.value)}</strong>
                </div>
              ))}
            </div>
          ))}
        </figure>
      )}
    </Paginated>
  );
}
