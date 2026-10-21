import { useState } from 'react';
import { Paginated } from '../../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { assignBarberServices } from '../services/catalog-service';
import { SaveForm } from '../../../shared/components/SaveForm';
import { money } from '../../employees/model/money';
import '../styles/catalog.css';

export function BarberServicesPanel({
  employeeId,
  onSaved,
  onChooseBranch,
}: {
  employeeId: string;
  onSaved: () => void;
  onChooseBranch?: () => void;
}) {
  const { catalog, assigned, loading, error, refresh, branchId, branchName } =
    useCatalog(employeeId);
  const selectionKey = `${employeeId}/${assigned.slice().sort().join(',')}`;
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>();
  const checked = selection?.key === selectionKey ? selection.ids : assigned;

  if (loading)
    return (
      <p className="employee-help" role="status">
        Cargando servicios del catálogo…
      </p>
    );
  if (error)
    return (
      <div className="data-error" role="alert">
        <p>{error}</p>
        <button className="action-secondary" onClick={refresh}>
          Reintentar
        </button>
      </div>
    );
  if (branchId === null)
    return (
      <section className="management-card">
        <h2>Asigná primero una sucursal</h2>
        <p className="employee-help">
          Los servicios y sus precios dependen de la sucursal del barbero.
        </p>
        {onChooseBranch && (
          <button className="action-primary" onClick={onChooseBranch}>
            Elegir sucursal del barbero
          </button>
        )}
      </section>
    );
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LO QUE REALIZA ESTE BARBERO</span>
          <h2>Servicios habilitados{branchName ? ` · ${branchName}` : ''}</h2>
        </div>
        <Link className="text-link" to="/admin/servicios">
          Ir al catálogo →
        </Link>
      </div>
      <p className="employee-help">
        Tildá los servicios que realiza. Solo aparecen servicios creados previamente en el catálogo
        de la barbería.
      </p>
      {!catalog.length ? (
        <div className="empty-team">
          <h3>
            {branchName
              ? `No hay servicios configurados en ${branchName}`
              : 'Todavía no hay servicios para asignar'}
          </h3>
          <p>
            {branchName
              ? 'En el catálogo, configurá el precio y la disponibilidad en esta sucursal.'
              : 'Primero creá los servicios de la barbería y después volvé a esta ficha.'}
          </p>
          <Link className="action-primary" to="/admin/servicios">
            {branchName ? 'Configurar servicios de la sucursal' : 'Crear servicios'}
          </Link>
        </div>
      ) : (
        <SaveForm
          key={assigned.slice().sort().join(',')}
          label="Guardar servicios del barbero"
          onSaved={() => {
            refresh();
            onSaved();
          }}
          save={() => assignBarberServices(employeeId, checked)}
        >
          <Paginated items={catalog}>
            {pageRows => (
              <div className="form-wide service-checklist">
                {pageRows.map(service => (
                  <label
                    key={service.id}
                    className={`service-checkbox ${!service.active ? 'service-inactive' : ''}`}
                  >
                    <input
                      type="checkbox"
                      name="services"
                      value={service.id}
                      checked={checked.includes(service.id)}
                      onChange={event =>
                        setSelection({
                          key: selectionKey,
                          ids: event.target.checked
                            ? [...checked, service.id]
                            : checked.filter(id => id !== service.id),
                        })
                      }
                      disabled={!service.active && !assigned.includes(service.id)}
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>
                        {money(service.price_cents)} · {service.duration_minutes} min
                        {!service.active ? ' · Inactivo' : ''}
                      </small>
                      {service.description && <small>{service.description}</small>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Paginated>
        </SaveForm>
      )}
      <p className="employee-help">
        Destildar quita la habilitación para nuevos trabajos; conserva los servicios realizados y
        sus comisiones. La misma comisión se aplica a todos los servicios.
      </p>
    </section>
  );
}
