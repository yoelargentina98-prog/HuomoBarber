import { useEffect, useState, type ReactNode } from 'react';
import { loadPage, type DataPage, type PageSource } from '../lib/pages';
import { Pagination } from './Pagination';

/** Keeps just the requested page in memory; totals and filters are evaluated by PostgreSQL. */
export function RemoteCollection<T>({
  source,
  children,
  cash = false,
}: {
  source: PageSource;
  children: (rows: T[]) => ReactNode;
  cash?: boolean;
}) {
  const scope = JSON.stringify([source.resource, source.filters]);
  const [position, setPosition] = useState({ scope, page: 0 });
  const [size, setSize] = useState(20);
  const page = position.scope === scope ? position.page : 0;
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([scope, source.revision, page, size, retry]);
  const [state, setState] = useState<{ key: string; data?: DataPage<T>; error?: string }>();
  useEffect(() => {
    let active = true;
    const [resource, filters] = JSON.parse(scope) as [string, Record<string, string>];
    loadPage<T>({ resource, filters }, page, size)
      .then(data => {
        if (active) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            error: cause instanceof Error ? cause.message : 'No se pudo cargar la página.',
          });
      });
    return () => {
      active = false;
    };
  }, [scope, page, size, key]);
  const current = state?.key === key ? state : undefined;
  if (!current) return <p role="status">Cargando página…</p>;
  if (current.error || !current.data)
    return (
      <div role="alert">
        <p>{current.error}</p>
        <button
          type="button"
          className="action-secondary"
          onClick={() => setRetry(value => value + 1)}
        >
          Reintentar listado
        </button>
      </div>
    );
  const data = current.data;
  return (
    <>
      {data.total ? (
        children(data.rows)
      ) : (
        <p className="empty-copy">No hay registros con los filtros seleccionados.</p>
      )}
      <Pagination
        page={data.page}
        size={size}
        total={data.total}
        onPage={value => setPosition({ scope, page: value })}
        onSize={
          cash
            ? value => {
                setSize(value);
                setPosition({ scope, page: 0 });
              }
            : undefined
        }
      />
    </>
  );
}
