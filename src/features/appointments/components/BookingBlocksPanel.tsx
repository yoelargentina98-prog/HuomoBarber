import { useEffect, useState } from 'react';
import { Pagination } from '../../../shared/components/Pagination';
import { SaveForm } from '../../../shared/components/SaveForm';
import { serviceDate } from '../../employees/model/period';
import { loadBlocks, loadBlockBarbers, saveBlock, removeBlock } from '../services/blocks-service';

export function BookingBlocksPanel({ branch }: { branch: string }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = `${branch}/${page}/${revision}`;
  const [state, setState] = useState<{
    key: string;
    data: Awaited<ReturnType<typeof loadBlocks>>;
    barbers: Awaited<ReturnType<typeof loadBlockBarbers>>;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    Promise.all([loadBlocks(branch, page), loadBlockBarbers(branch)])
      .then(([data, barbers]) => {
        if (active) setState({ key, data, barbers });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            data: { rows: [], total: 0 },
            barbers: [],
            error: cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.',
          });
      });
    return () => {
      active = false;
    };
  }, [branch, page, key]);
  const current = state?.key === key ? state : undefined;
  function refresh() {
    setRevision(v => v + 1);
    setPage(0);
  }
  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await removeBlock(id);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo quitar el bloqueo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-card">
      <h2>Bloqueos de agenda</h2>
      <p className="employee-help">
        Cerrá un período para toda la sucursal o un barbero. Los turnos confirmados deben
        reprogramarse antes de bloquear ese horario.
      </p>
      {!current ? (
        <p role="status">Cargando bloqueos…</p>
      ) : current.error ? (
        <div role="alert">
          {current.error}
          <button className="text-button" onClick={refresh}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <SaveForm
            label="Agregar bloqueo"
            resetOnSuccess
            save={data => saveBlock(branch, data)}
            onSaved={refresh}
          >
            <label>
              Desde (Argentina)
              <input name="start" type="datetime-local" required />
            </label>
            <label>
              Hasta (Argentina)
              <input name="end" type="datetime-local" required />
            </label>
            <label>
              Alcance
              <select name="barber">
                <option value="">Toda la sucursal</option>
                {current.barbers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.full_name ?? b.username}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo
              <input name="reason" required minLength={3} maxLength={300} />
            </label>
          </SaveForm>
          {error && <p role="alert">{error}</p>}
          {!current.data.rows.length ? (
            <p className="empty-copy">Sin bloqueos vigentes o próximos.</p>
          ) : (
            <ul className="employee-timeline">
              {current.data.rows.map(b => (
                <li key={b.id}>
                  <strong>{b.reason}</strong>
                  <p>
                    {serviceDate(b.starts_at)} — {serviceDate(b.ends_at)}
                  </p>
                  <p>
                    {b.barber_id
                      ? (current.barbers.find(person => person.id === b.barber_id)?.full_name ??
                        'Barbero asignado')
                      : 'Toda la sucursal'}
                  </p>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => void remove(b.id)}
                  >
                    Quitar bloqueo
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} size={20} total={current.data.total} onPage={setPage} />
        </>
      )}
    </section>
  );
}
