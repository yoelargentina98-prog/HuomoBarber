import { Paginated } from '../../../shared/components/Paginated';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../../employees/model/money';
import { loadBranchCommissions, type BranchCommission } from './service';
export function BranchCommissions({
  branch,
  month,
  revision,
}: {
  branch: string;
  month: string;
  revision: number;
}) {
  const key = `${branch}/${month}/${revision}`;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    retry: number;
    rows: BranchCommission[];
    error: string;
  }>();
  useEffect(() => {
    let active = true;
    loadBranchCommissions(branch, month)
      .then(rows => {
        if (active) setState({ key, retry, rows, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            retry,
            rows: [],
            error: cause instanceof Error ? cause.message : 'No se pudieron cargar las comisiones.',
          });
      });
    return () => {
      active = false;
    };
  }, [branch, month, key, retry]);
  const current = state?.key === key && state.retry === retry ? state : undefined;
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COSTO OPERATIVO AUTOMÁTICO</span>
          <h2>Comisiones por barbero</h2>
        </div>
      </div>
      <p className="employee-help">
        Ya están descontadas en el balance. Se usa la comisión original de cada servicio, sin
        anulados. El pago posterior se registra como Pago de comisiones para no restarlo otra vez.
      </p>
      {!current ? (
        <p role="status">Cargando costos por barbero…</p>
      ) : current.error ? (
        <div role="alert">
          <p>{current.error}</p>
          <button className="action-secondary" onClick={() => setRetry(value => value + 1)}>
            Reintentar comisiones
          </button>
        </div>
      ) : !current.rows.length ? (
        <p className="empty-copy">
          No hay barberos asignados ni servicios históricos en esta sucursal durante el mes.
        </p>
      ) : (
        <Paginated
          items={current.rows}
          source={{
            resource: 'branch_commissions',
            filters: { branch, month: `${month}-01` },
            revision,
          }}
        >
          {pageRows => (
            <div className="branch-finance-table-scroll">
              <table role="table" className="branch-finance-table">
                <thead>
                  <tr>
                    <th>Barbero</th>
                    <th>Servicios del mes</th>
                    <th>Comisión generada</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => (
                    <tr key={row.employee_id}>
                      <td data-label="Barbero">
                        <Link className="text-link" to={`/admin/personal/${row.employee_id}`}>
                          {row.full_name ?? row.username}
                        </Link>
                        {!row.active && <small>Cuenta inactiva</small>}
                        {!row.belongs_here && (
                          <small>Histórico: actualmente en otra sucursal</small>
                        )}
                      </td>
                      <td data-label="Servicios del mes">{row.service_count}</td>
                      <td data-label="Comisión generada">
                        <strong>{money(row.commission_cents)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Paginated>
      )}
    </section>
  );
}
