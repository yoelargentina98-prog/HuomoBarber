import { useEffect, useState } from 'react';
import { loadBarberHistory, type BarberHistory } from './service';
import { money } from '../../employees/model/money';
import { serviceDate } from '../../employees/model/period';
export function RecentServices({ week, revision = 0 }: { week: string; revision?: number }) {
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const key = `${week}/${page}/${revision}/${retry}`;
  const [state, setState] = useState<{ key: string; data?: BarberHistory; error?: string }>();
  useEffect(() => {
    let active = true;
    loadBarberHistory(week, page)
      .then(data => {
        if (active) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            error: cause instanceof Error ? cause.message : 'No se pudo cargar tu historial.',
          });
      });
    return () => {
      active = false;
    };
  }, [week, page, key]);
  const current = state?.key === key ? state : undefined;
  const data = current?.data;
  return (
    <section className="management-card">
      <div className="section-heading">
        <h2>Todos mis servicios</h2>
        {data && <span className="subtle-tag">{data.total} en la semana</span>}
      </div>
      {!current && <p role="status">Cargando historial…</p>}
      {current?.error && (
        <div role="alert">
          <p>{current.error}</p>
          <button className="action-secondary" onClick={() => setRetry(value => value + 1)}>
            Reintentar historial
          </button>
        </div>
      )}
      {data &&
        (!data.total ? (
          <p className="empty-copy">No hay servicios realizados en esta semana.</p>
        ) : (
          <>
            <div className="barber-table-scroll">
              <table className="barber-table">
                <thead>
                  <tr>
                    <th scope="col">Servicio / fecha</th>
                    <th scope="col">Importe</th>
                    <th scope="col">Tu comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(job => (
                    <tr key={job.id}>
                      <th scope="row">
                        {job.service_name}
                        <small>{serviceDate(job.performed_at)}</small>
                        <small>{job.branch_name ?? 'Sucursal histórica sin registrar'}</small>
                      </th>
                      <td data-label="Importe del servicio">{money(job.amount_cents)}</td>
                      <td data-label="Tu comisión">{money(job.commission_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="barber-pagination">
              <p aria-live="polite">
                {data.items.length ? `${page * 20 + 1}–${page * 20 + data.items.length}` : '0'} de{' '}
                {data.total} servicios
              </p>
              <div>
                <button
                  className="action-secondary"
                  disabled={page === 0}
                  onClick={() => setPage(value => value - 1)}
                >
                  Anteriores
                </button>
                <button
                  className="action-secondary"
                  disabled={(page + 1) * 20 >= data.total}
                  onClick={() => setPage(value => value + 1)}
                >
                  Siguientes
                </button>
              </div>
            </div>
          </>
        ))}
    </section>
  );
}
