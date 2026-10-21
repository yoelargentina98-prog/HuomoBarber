import { Paginated } from '../../../shared/components/Paginated';
import { useState } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { CatalogForm } from '../components/CatalogForm';
import { setCatalogActive, type CatalogService } from '../services/catalog-service';
import { BranchPricePanel } from '../../branches/components/BranchPricePanel';
import { SERVICE_CATEGORIES, type ServiceCategory } from '../../employees/model/types';
import '../../../styles/forms.css';
import '../styles/catalog.css';

export function CatalogPage() {
  const { catalog, loading, error, refresh, revision } = useCatalog();
  const [editing, setEditing] = useState<CatalogService | 'new' | null>(null);
  const [pricing, setPricing] = useState<CatalogService | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const visible = catalog.filter(
    service =>
      (status === 'all' || service.active === (status === 'active')) &&
      service.name.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR'))
  );
  async function toggle(service: CatalogService) {
    setBusy(service.id);
    setActionError('');
    try {
      await setCatalogActive(service.id, !service.active);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATÁLOGO DE LA BARBERÍA</span>
          <h1>Servicios</h1>
          <p>Creá los servicios que ofrecés y después asignálos a cada barbero.</p>
        </div>
        <button className="action-primary" onClick={() => setEditing('new')}>
          + Nuevo servicio
        </button>
      </div>
      {editing && (
        <CatalogForm
          key={editing === 'new' ? 'new' : editing.id}
          service={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {pricing && (
        <BranchPricePanel
          key={pricing.id}
          serviceId={pricing.id}
          serviceName={pricing.name}
          onCancel={() => setPricing(null)}
          onSaved={() => {
            setPricing(null);
            refresh();
          }}
        />
      )}
      <section className="management-card">
        <div className="section-heading">
          <h2>Servicios de Huomo</h2>
          <span className="staff-count">{loading ? 'Cargando…' : 'Catálogo de servicios'}</span>
        </div>
        <div className="staff-toolbar">
          <label className="staff-search">
            <input
              aria-label="Buscar servicio"
              type="search"
              placeholder="Buscar por nombre…"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar estado"
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        {(error || actionError) && (
          <div className="data-error" role="alert">
            <p>{error || actionError}</p>
            <button className="action-secondary" onClick={refresh}>
              Reintentar
            </button>
          </div>
        )}
        {loading ? (
          <p role="status" className="empty-copy">
            Cargando servicios…
          </p>
        ) : (
          !error &&
          (catalog.length ? (
            <Paginated
              items={visible}
              source={{ resource: 'catalog', filters: { search: query, status }, revision }}
            >
              {pageRows => (
                <div className="staff-table-wrapper">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>SERVICIO</th>
                        <th>TARIFAS</th>
                        <th>DURACIÓN</th>
                        <th>ESTADO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(service => (
                        <tr key={service.id}>
                          <td>
                            <strong>{service.name}</strong>
                            <small className="catalog-detail">
                              {SERVICE_CATEGORIES[service.category as ServiceCategory]}
                              {service.description ? ` · ${service.description}` : ''}
                            </small>
                          </td>
                          <td>
                            <button className="text-button" onClick={() => setPricing(service)}>
                              Precios por sucursal
                            </button>
                          </td>
                          <td>{service.duration_minutes} min</td>
                          <td>
                            <span
                              className={`role-tag ${service.active ? 'role-barber' : 'role-reception'}`}
                            >
                              {service.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <div className="catalog-actions">
                              <button className="text-button" onClick={() => setEditing(service)}>
                                Editar
                              </button>
                              <button
                                className="text-button"
                                disabled={busy !== null}
                                onClick={() => void toggle(service)}
                              >
                                {busy === service.id
                                  ? 'Guardando…'
                                  : service.active
                                    ? 'Desactivar'
                                    : 'Reactivar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Paginated>
          ) : (
            <div className="empty-team">
              <h3>
                {catalog.length
                  ? 'No encontramos servicios con ese filtro'
                  : 'Primero, tu catálogo'}
              </h3>
              <p>
                {catalog.length
                  ? 'Probá otro nombre o estado.'
                  : 'Creá el primer servicio de la barbería. Luego podrás tildarlo en los perfiles de tus barberos.'}
              </p>
            </div>
          ))
        )}
      </section>
      <p className="employee-help">
        Desactivar conserva asignaciones e historial, pero impide nuevos trabajos con ese servicio.
        No se borran servicios usados.
      </p>
    </div>
  );
}
