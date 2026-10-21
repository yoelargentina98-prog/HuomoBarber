import { useState } from 'react';
import { currentMonth } from '../../employees/model/period';
import { useBranchBalances } from './useBranchBalances';
import { BalanceCards } from './BalanceCards';
import { BalanceChart } from './BalanceChart';
import { money } from '../../employees/model/money';
import './finance.css';
export function BranchComparison() {
  const [month, setMonth] = useState(currentMonth);
  const { rows, error, loading, refresh } = useBranchBalances(month);
  const bestIncome = Math.max(0, ...rows.map(row => row.income_cents));
  const hasActivity = rows.some(row => row.income_cents > 0 || row.total_cost_cents > 0);
  const bestBalance = Math.max(...rows.map(row => row.balance_cents));
  return (
    <section className="management-card branch-comparison">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CADA SUCURSAL, EN NÚMEROS</span>
          <h2>Balance comparativo</h2>
        </div>
        <label className="employee-period">
          Mes del balance
          <input
            type="month"
            value={month}
            onChange={event => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </label>
      </div>
      <p className="employee-help">
        Saldo estimado = cobros − gastos manuales − comisiones generadas. Las comisiones se imputan
        al mes del servicio y a su sucursal histórica, aunque todavía no se hayan pagado. Los fijos
        y otros costos se cargan como gastos manuales.
      </p>
      {loading ? (
        <p role="status">Cargando balance…</p>
      ) : error ? (
        <div role="alert" className="data-error">
          <p>{error}</p>
          <button className="action-secondary" onClick={refresh}>
            Reintentar balance
          </button>
        </div>
      ) : (
        <>
          <BalanceCards rows={rows} />
          {hasActivity ? (
            <div className="branch-finance-leaders">
              {bestIncome > 0 && (
                <p>
                  <span>Mayor recaudación</span>
                  <strong>
                    {rows
                      .filter(row => row.income_cents === bestIncome)
                      .map(row => row.branch_name)
                      .join(' · ')}
                  </strong>
                  <small>{money(bestIncome)}</small>
                </p>
              )}
              <p>
                <span>Mejor saldo</span>
                <strong>
                  {rows
                    .filter(row => row.balance_cents === bestBalance)
                    .map(row => row.branch_name)
                    .join(' · ')}
                </strong>
                <small>{money(bestBalance)}</small>
              </p>
            </div>
          ) : (
            <p className="empty-copy">
              No hay cobros ni gastos registrados en este mes. No hay una sucursal líder todavía.
            </p>
          )}
          {rows.length > 0 && <BalanceChart rows={rows} />}
        </>
      )}
    </section>
  );
}
