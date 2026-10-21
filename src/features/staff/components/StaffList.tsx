import type { PageSource } from '../../../shared/lib/pages';
import { Paginated } from '../../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import type { StaffMember } from '../services/staff-service';
import { AdminIcon } from '../../admin/components/AdminIcon';

export function StaffList({
  members,
  source,
  compact = false,
  filtered = false,
}: {
  members: StaffMember[];
  source?: PageSource;
  compact?: boolean;
  filtered?: boolean;
}) {
  if (!source && !members.length)
    return (
      <div className="empty-team">
        <AdminIcon name={filtered ? 'search' : 'team'} size={34} />
        <h3>{filtered ? 'No encontramos coincidencias' : 'Tu equipo empieza acá'}</h3>
        <p>
          {filtered
            ? 'Probá con otro nombre o cambiá el filtro.'
            : 'Agregá tu primer barbero o recepcionista para empezar a organizar tu negocio.'}
        </p>
        {!filtered && (
          <Link className="text-link" to="/admin/personal?nuevo=1">
            Crear primer empleado <AdminIcon name="arrow" size={16} />
          </Link>
        )}
      </div>
    );
  return (
    <Paginated items={members} source={source}>
      {pageRows => (
        <div className="staff-table-wrapper">
          <table role="table" className="staff-table">
            <thead>
              <tr>
                <th scope="col">PERSONA</th>
                <th scope="col">ROL</th>
                {!compact && (
                  <>
                    <th scope="col">USUARIO</th>
                    <th scope="col">TELÉFONO</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(member => (
                <tr key={member.id}>
                  <td data-label="Persona">
                    <Link
                      className="staff-person staff-person-link"
                      to={`/admin/personal/${member.id}`}
                    >
                      <span className="staff-avatar">
                        {(member.full_name ?? member.username ?? '?')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(part => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>{member.full_name ?? member.username}</strong>
                        <small>{member.branch_name ?? 'Sucursal pendiente'}</small>
                        {compact && <small>{member.username ?? 'Cuenta existente'}</small>}
                      </span>
                    </Link>
                  </td>
                  <td data-label="Rol">
                    <span className={`role-tag role-${member.role}`}>
                      {member.role === 'barber' ? 'Barbero' : 'Recepcionista'}
                    </span>
                  </td>
                  {!compact && (
                    <>
                      <td data-label="Usuario">{member.username ?? 'Sin asignar'}</td>
                      <td data-label="Teléfono">{member.phone || '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paginated>
  );
}
