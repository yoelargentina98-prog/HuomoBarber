import { useEffect, useState } from 'react';
import { Pagination } from '../../shared/components/Pagination';
import { money } from '../employees/model/money';
import { clubHistory, type ClubHistory } from './service';
import './club.css';
export function ClubHistoryPanel({ client, branch }: { client?: string; branch?: string }) {
  const [page, setPage] = useState(0);
  const key = `${client}/${branch}/${page}`;
  const [state, setState] = useState<{ key: string; data?: ClubHistory; error?: string }>();
  useEffect(() => {
    let active = true;
    clubHistory(page, client, branch)
      .then(data => {
        if (active) setState({ key, data });
      })
      .catch(() => {
        if (active) setState({ key, error: 'No se pudo cargar el historial.' });
      });
    return () => {
      active = false;
    };
  }, [page, client, branch, key]);
  const current = state?.key === key ? state : undefined;
  return (
    <section className="club-history">
      <h2>Servicios realizados</h2>
      {!current ? (
        <p role="status">Cargando historial…</p>
      ) : current.error ? (
        <p role="alert">{current.error}</p>
      ) : (
        current.data && (
          <>
            <p>
              {current.data.summary.services} servicios · {current.data.summary.visitDays} días con
              visitas · Total: {money(current.data.summary.spentCents)}
            </p>
            {current.data.summary.lastVisit && (
              <p>
                Última visita:{' '}
                {new Date(current.data.summary.lastVisit).toLocaleDateString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
              </p>
            )}
            {!current.data.rows.length ? (
              <p>Todavía no hay servicios registrados.</p>
            ) : (
              <ul className="club-history__rows">
                {current.data.rows.map(row => (
                  <li key={row.id}>
                    <strong>
                      {row.service_name} · {money(row.amount_cents)}
                    </strong>
                    <span>
                      {row.branch_name} · {row.barber_name}
                    </span>
                    <time dateTime={row.performed_at}>
                      {new Date(row.performed_at).toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={page} size={20} total={current.data.total} onPage={setPage} />
          </>
        )
      )}
    </section>
  );
}
