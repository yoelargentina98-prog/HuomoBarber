import type { ReactNode } from 'react';
import { AdminIcon } from '../../admin/components/AdminIcon';
import './shell.css';
import './mobile.css';
import { barberSections, type BarberSection, type BarberProfile } from './model';
export function BarberShell({
  profile,
  section,
  onNavigate,
  children,
  leaving,
  logoutError,
  onLogout,
}: {
  profile: BarberProfile;
  section: BarberSection;
  onNavigate: (section: BarberSection) => void;
  children: ReactNode;
  leaving: boolean;
  logoutError: string;
  onLogout: () => void;
}) {
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
  function navigate(next: BarberSection) {
    onNavigate(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  const date = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return (
    <div className="management-app barber-shell">
      <a className="skip-link" href="#barber-content">
        Saltar al contenido
      </a>
      <header className="barber-mobile-header">
        <div>
          <span className="brand-word">
            HUOMO<span>®</span>
          </span>
          <small>
            {profile.name} · {profile.branchName ?? 'Sucursal pendiente'}
          </small>
        </div>
        <button type="button" aria-label="Cerrar sesión" disabled={leaving} onClick={onLogout}>
          <AdminIcon name="logout" size={21} />
        </button>
      </header>
      <aside className="management-sidebar barber-sidebar">
        <div className="sidebar-brand">
          <span className="brand-word">
            HUOMO<span>®</span>
          </span>
          <span>EL OFICIO DE SER VOS.</span>
        </div>
        <div className="barber-sidebar-profile">
          <span className="barber-avatar">{initials}</span>
          <strong>{profile.name}</strong>
          <small>@{profile.username}</small>
          <span className="barber-profession">BARBERO</span>
        </div>
        <p className="nav-caption">MI ESPACIO DE TRABAJO</p>
        <nav className="barber-navigation" aria-label="Mi espacio de barbero">
          {Object.entries(barberSections).map(([key, item]) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => navigate(key as BarberSection)}
            >
              <AdminIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="barber-sidebar-bottom">
          <div className="barber-branch">
            <AdminIcon name="branches" />
            <div>
              <small>MI SUCURSAL</small>
              <strong>{profile.branchName ?? 'Sin asignar'}</strong>
            </div>
          </div>
          <button className="logout-button" disabled={leaving} onClick={onLogout}>
            <AdminIcon name="logout" />
            {leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
          <span className="barber-sidebar-signature">CADA DETALLE CUENTA.</span>
        </div>
      </aside>
      <div className="management-body">
        <header className="management-topbar">
          <div className="breadcrumb">
            Mi espacio <span>/</span>
            <strong>{barberSections[section].label}</strong>
          </div>
          <div className="barber-topbar-date">
            {date}
            <span className="user-avatar">{initials}</span>
          </div>
        </header>
        <main id="barber-content" className="management-content">
          {section === 'overview' && (
            <section className="barber-welcome">
              <div>
                <span className="eyebrow">TU OFICIO. TU CRECIMIENTO.</span>
                <h1>
                  Hola, {profile.name.split(' ')[0]}
                  <span>.</span>
                </h1>
                <p>
                  Todo lo que hacés, en un solo lugar.
                  <br />
                  Tu trabajo, tu semana y lo que viene.
                </p>
                <button onClick={() => navigate('earnings')}>
                  Ver mi caja <AdminIcon name="arrow" size={16} />
                </button>
              </div>
              <div className="barber-welcome-mark" aria-hidden="true">
                <AdminIcon name="scissors" size={108} />
                <span>HUOMO BARBER CLUB</span>
              </div>
            </section>
          )}
          {children}
        </main>
        <footer className="management-footer">
          <span>
            HUOMO <span className="footer-muted">/ Tu espacio personal</span>
          </span>
          <span>El detalle hace la diferencia.</span>
        </footer>
      </div>
    </div>
  );
}
