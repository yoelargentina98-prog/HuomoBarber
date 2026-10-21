import { Paginated } from '../../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import { money } from '../../employees/model/money';
import { barberName, leaders, weeklyTotals, type WeeklyBarber } from './model';

export function WeekResults({ rows }: { rows: WeeklyBarber[] }) {
  const totals = weeklyTotals(rows);
  const metrics = [
    { key: 'revenue_cents', label: 'Más generó', format: money },
    {
      key: 'service_count',
      label: 'Más servicios realizó',
      format: (value: number) => `${value} servicios`,
    },
    { key: 'commission_cents', label: 'Más comisión acumuló', format: money },
  ] as const;
  return (
    <>
      <div className="team-week-totals" aria-label="Totales semanales">
        <p>
          <span>Generado en servicios</span>
          <strong>{money(totals.revenue)}</strong>
        </p>
        <p>
          <span>Servicios realizados</span>
          <strong>{totals.services}</strong>
        </p>
        <p>
          <span>Comisión generada</span>
          <strong>{money(totals.commission)}</strong>
        </p>
        <p>
          <span>Promedio por servicio</span>
          <strong>
            {money(totals.services ? Math.round(totals.revenue / totals.services) : 0)}
          </strong>
        </p>
      </div>
      {!rows.length ? (
        <p className="empty-copy">Todavía no hay servicios realizados en esta semana y sucursal.</p>
      ) : (
        <>
          <div className="team-week-highlights">
            {metrics.map(metric => {
              const winners = leaders(rows, metric.key);
              return (
                <article key={metric.key}>
                  <span className="eyebrow">{metric.label}</span>
                  {!winners.length ? (
                    <p>Sin comisión generada</p>
                  ) : (
                    <>
                      <strong className="team-week-value">
                        {metric.format(winners[0]![metric.key])}
                      </strong>
                      {winners.length > 1 && <small>Empate · {winners.length} barberos</small>}
                      <Paginated items={winners}>
                        {pageWinners => (
                          <>
                            {pageWinners.map(row => (
                              <Link key={row.employee_id} to={`/admin/personal/${row.employee_id}`}>
                                {barberName(row)}
                              </Link>
                            ))}
                          </>
                        )}
                      </Paginated>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          <details className="team-week-ranking">
            <summary>Ver detalle de los {rows.length} barberos con actividad</summary>
            <Paginated items={rows}>
              {pageRows => (
                <div className="table-scroll">
                  <table>
                    <caption>Desempeño semanal, ordenado por importe generado</caption>
                    <thead>
                      <tr>
                        <th scope="col">Barbero</th>
                        <th scope="col">Servicios</th>
                        <th scope="col">Generado</th>
                        <th scope="col">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(row => (
                        <tr key={row.employee_id}>
                          <th scope="row">
                            <Link to={`/admin/personal/${row.employee_id}`}>{barberName(row)}</Link>
                          </th>
                          <td>{row.service_count}</td>
                          <td>{money(row.revenue_cents)}</td>
                          <td>{money(row.commission_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Paginated>
          </details>
        </>
      )}
    </>
  );
}
