import type { PageSource } from '../../../shared/lib/pages';
import { Paginated } from '../../../shared/components/Paginated';
import { useState } from 'react';
import { AdminIcon } from '../../admin/components/AdminIcon';
import type { ReceptionEmployee } from './service';
export function ReceptionTeam({
  team,
  source,
  loading,
  error,
  onRefresh,
}: {
  team: ReceptionEmployee[];
  source?: PageSource;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const filtered = team.filter(
    person =>
      (role === 'all' || person.role === role) &&
      `${person.full_name ?? ''} ${person.username ?? ''}`
        .toLocaleLowerCase('es-AR')
        .includes(search.toLocaleLowerCase('es-AR'))
  );
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PERSONAS DE TU SUCURSAL</span>
          <h2>Equipo</h2>
        </div>
        <button className="action-secondary" disabled={loading} onClick={onRefresh}>
          Actualizar equipo
        </button>
      </div>
      <p className="employee-help">
        Consultá quién pertenece a la sucursal y qué servicios tiene habilitados. Los cambios de
        personal los realiza administración.
      </p>
      <div className="staff-toolbar">
        <label className="staff-search">
          <AdminIcon name="search" size={17} />
          <input
            type="search"
            aria-label="Buscar en mi sucursal"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nombre o usuario…"
          />
        </label>
        <select
          aria-label="Rol del equipo"
          value={role}
          onChange={event => setRole(event.target.value)}
        >
          <option value="all">Todos los roles</option>
          <option value="barber">Barberos</option>
          <option value="reception">Recepcionistas</option>
        </select>
      </div>
      {loading ? (
        <p role="status" className="empty-copy">
          Cargando equipo…
        </p>
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !source && !filtered.length ? (
        <p className="empty-copy">
          {team.length
            ? 'No hay personas que coincidan con la búsqueda.'
            : 'No hay empleados asignados a esta sucursal.'}
        </p>
      ) : (
        <Paginated
          items={filtered}
          source={source ? { ...source, filters: { ...source.filters, role, search } } : undefined}
        >
          {pageRows => (
            <div className="reception-team-grid">
              {pageRows.map(person => (
                <article key={person.id} className="reception-person">
                  <div className="reception-person-heading">
                    <span className="reception-initials">
                      {(person.full_name || person.username || '?')
                        .split(' ')
                        .slice(0, 2)
                        .map(word => word[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                    <span
                      className={`role-tag ${person.role === 'barber' ? 'role-barber' : 'role-reception'}`}
                    >
                      {person.role === 'barber' ? 'Barbero' : 'Recepcionista'}
                    </span>
                  </div>
                  <h3>{person.full_name ?? person.username}</h3>
                  <p>@{person.username ?? 'Sin usuario'}</p>
                  <span
                    className={person.active ? 'reception-status' : 'reception-status inactive'}
                  >
                    <span />
                    {person.active ? 'Cuenta activa' : 'Cuenta inactiva'}
                  </span>
                  {person.role === 'barber' && (
                    <div className="reception-services">
                      <small>SERVICIOS HABILITADOS</small>
                      {person.services.length ? (
                        <div>
                          <Paginated items={person.services}>
                            {pageServices => (
                              <>
                                {pageServices.map(service => (
                                  <span key={service}>{service}</span>
                                ))}
                              </>
                            )}
                          </Paginated>
                        </div>
                      ) : (
                        <p>Sin servicios habilitados en esta sucursal.</p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Paginated>
      )}
    </section>
  );
}
