import './pagination.css';

export function Pagination({
  page,
  size,
  total,
  onPage,
  onSize,
  busy = false,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  busy?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className="pagination" aria-label="Paginación del listado">
      <span role="status">
        {total
          ? `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total}`
          : '0 registros'}
      </span>
      {onSize && (
        <label>
          Filas por página
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            defaultValue={size}
            key={size}
            onBlur={event => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 1 && value <= 200) onSize(value);
              else event.target.value = String(size);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </label>
      )}
      <div className="pagination-actions">
        <button type="button" disabled={busy || page === 0} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {page + 1} de {pages}
        </span>
        <button type="button" disabled={busy || page + 1 >= pages} onClick={() => onPage(page + 1)}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
