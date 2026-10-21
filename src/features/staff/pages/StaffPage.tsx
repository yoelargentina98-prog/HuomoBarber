import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StaffForm } from '../components/StaffForm';
import { StaffList } from '../components/StaffList';
import { useStaffData } from '../hooks/staff-context';
import { AdminIcon } from '../../admin/components/AdminIcon';
import { TeamDashboard } from '../dashboard/TeamDashboard';
import '../staff.css';

export function StaffPage() {
  const { members, loading, error, refresh, addMember, counts, paginated, revision } =
    useStaffData();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const creating = params.get('nuevo') === '1';
  const filtered = members.filter(
    member =>
      (role === 'all' || member.role === role) &&
      `${member.full_name ?? ''} ${member.username ?? ''} ${member.phone ?? ''}`
        .toLocaleLowerCase('es-AR')
        .includes(search.toLocaleLowerCase('es-AR'))
  );
  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PERSONAS QUE HACEN HUOMO</span>
          <h1>Equipo</h1>
          <p>Administrá las cuentas de tus barberos y recepcionistas.</p>
        </div>
        <button
          className={creating ? 'action-secondary' : 'action-primary'}
          onClick={() => setParams(creating ? {} : { nuevo: '1' })}
        >
          <AdminIcon name="plus" />
          {creating ? 'Cerrar formulario' : 'Nuevo empleado'}
        </button>
      </div>
      <TeamDashboard />
      {creating && (
        <div className="staff-editor">
          <StaffForm
            onCreated={member => {
              addMember(member);
            }}
          />
        </div>
      )}
      <section className="management-card">
        <div className="section-heading">
          <h2>Personal registrado</h2>
          <span className="staff-count">
            {loading
              ? 'Cargando…'
              : error
                ? 'Sin actualizar'
                : `${counts ? counts.barber + counts.reception : members.length} personas`}
          </span>
        </div>
        <div className="staff-toolbar">
          <label className="staff-search">
            <AdminIcon name="search" size={17} />
            <input
              type="search"
              aria-label="Buscar personal"
              placeholder="Buscar por nombre, usuario o teléfono…"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por rol"
            value={role}
            onChange={event => setRole(event.target.value)}
          >
            <option value="all">Todos los roles</option>
            <option value="barber">Barberos</option>
            <option value="reception">Recepcionistas</option>
          </select>
        </div>
        {error ? (
          <div className="data-error" role="alert">
            <div>
              <strong>No pudimos cargar el equipo</strong>
              <p>{error}</p>
            </div>
            <button className="action-secondary" onClick={refresh}>
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <p className="empty-copy" role="status">
            Cargando personal…
          </p>
        ) : (
          <StaffList
            source={
              paginated ? { resource: 'staff', filters: { role, search }, revision } : undefined
            }
            members={filtered}
            filtered={search !== '' || role !== 'all'}
          />
        )}
      </section>
    </div>
  );
}
