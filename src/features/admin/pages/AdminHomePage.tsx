import { Link } from 'react-router-dom';
import { AdminIcon } from '../components/AdminIcon';
import { useStaffData } from '../../staff/hooks/staff-context';
import { StaffList } from '../../staff/components/StaffList';

export function AdminHomePage() {
  const { members, loading, error, refresh, counts } = useStaffData();
  const count = (role?: string) =>
    loading
      ? '…'
      : error
        ? '—'
        : counts
          ? role
            ? counts[role as keyof typeof counts]
            : counts.barber + counts.reception
          : members.filter(member => !role || member.role === role).length;
  const date = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VISTA GENERAL</span>
          <h1>Resumen del negocio</h1>
          <p>Tu equipo y lo que necesitás para seguir creciendo.</p>
        </div>
        <span className="date-label">
          <AdminIcon name="calendar" />
          {date}
        </span>
      </div>
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">CADA GRAN BARBERÍA EMPIEZA POR SU EQUIPO</span>
          <h2>
            El próximo capítulo
            <br />
            lo construís con ellos.
          </h2>
          <p>Organizá a tus barberos y recepcionistas desde un mismo lugar.</p>
          <Link className="action-primary" to="/admin/personal?nuevo=1">
            <AdminIcon name="plus" />
            Agregar empleado
          </Link>
        </div>
        <div className="welcome-mark" aria-hidden="true">
          <AdminIcon name="scissors" size={110} />
          <span>HUOMO / EQUIPO</span>
        </div>
      </section>
      <section className="metrics-grid" aria-label="Resumen del equipo">
        {[
          {
            label: 'PERSONAS EN EL EQUIPO',
            value: count(),
            detail: 'Barberos y recepción',
            icon: 'team' as const,
          },
          {
            label: 'BARBEROS',
            value: count('barber'),
            detail: 'Profesionales registrados',
            icon: 'scissors' as const,
          },
          {
            label: 'RECEPCIONISTAS',
            value: count('reception'),
            detail: 'Atención y coordinación',
            icon: 'calendar' as const,
          },
        ].map(item => (
          <article className="metric-card" key={item.label}>
            <div>
              <span>{item.label}</span>
              <AdminIcon name={item.icon} />
            </div>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>
      {error && (
        <div className="data-error" role="alert">
          <div>
            <strong>No pudimos actualizar el equipo</strong>
            <p>{error}</p>
          </div>
          <button className="action-secondary" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}
      <div className="dashboard-columns">
        <section className="management-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PERSONAS</span>
              <h2>Tu equipo</h2>
            </div>
            <Link className="text-link" to="/admin/personal">
              Ver equipo <AdminIcon name="arrow" size={16} />
            </Link>
          </div>
          {loading ? (
            <p role="status" className="empty-copy">
              Cargando equipo…
            </p>
          ) : error ? (
            <p className="empty-copy">
              El listado estará disponible cuando se restablezca la conexión.
            </p>
          ) : (
            <StaffList members={members.slice(0, 5)} compact />
          )}
        </section>
        <section className="management-card next-module">
          <span className="module-icon">
            <AdminIcon name="calendar" size={26} />
          </span>
          <span className="subtle-tag">PRÓXIMAMENTE</span>
          <h2>Un día más organizado.</h2>
          <p>La agenda reunirá los turnos, los horarios y la disponibilidad de cada barbero.</p>
          <div className="module-preview" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="module-footnote">
            <AdminIcon name="clock" size={16} />
            La agenda todavía está en preparación.
          </div>
        </section>
      </div>
    </div>
  );
}
