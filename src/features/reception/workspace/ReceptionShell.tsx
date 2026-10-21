import type { ReactNode } from 'react';
import { AdminIcon } from '../../admin/components/AdminIcon';
import type { CashOperator } from '../../cash/sales/service';
import { receptionSections, type ReceptionSection } from './model';
import './workspace.css';
export function ReceptionShell({
  operator,
  section,
  onNavigate,
  children,
  busy,
  error,
  onLogout,
}: {
  operator: CashOperator;
  section: ReceptionSection;
  onNavigate: (section: ReceptionSection) => void;
  children: ReactNode;
  busy: boolean;
  error: string;
  onLogout: () => void;
}) {
  const name = operator.name || operator.username || 'Recepción';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
  const date = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return (
    <div className="management-app reception-workspace">
      <a className="skip-link" href="#reception-content">
        Saltar al contenido
      </a>
      <aside className="management-sidebar">
        <div className="sidebar-brand">
          <span className="brand-word">
            HUOMO<span>®</span>
          </span>
          <span>RECEPCIÓN & EXPERIENCIA</span>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">{initials}</span>
          <div>
            <strong>{name}</strong>
            <small>{operator.role === 'admin' ? 'Administración' : 'Recepcionista'}</small>
          </div>
          <span className="online-dot" />
        </div>
        <p className="nav-caption">EL DÍA A DÍA</p>
        <nav className="management-nav reception-nav" aria-label="Recepción">
          {Object.entries(receptionSections).map(([key, item]) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => onNavigate(key as ReceptionSection)}
            >
              <AdminIcon name={item.icon} />
              {item.label}
              {key === 'agenda' && <small>Pronto</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="reception-branch-label">
            <AdminIcon name="branches" />
            <div>
              <small>SUCURSAL ASIGNADA</small>
              <strong>{operator.branchName || 'Vista de administrador'}</strong>
            </div>
          </div>
          <button className="logout-button" disabled={busy} onClick={onLogout}>
            <AdminIcon name="logout" />
            {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="management-body">
        <header className="management-topbar">
          <div className="breadcrumb">
            Recepción <span>/</span>
            <strong>{receptionSections[section].label}</strong>
          </div>
          <div className="reception-date">
            {date}
            <span className="user-avatar">{initials}</span>
          </div>
        </header>
        <main id="reception-content" className="management-content">
          {children}
        </main>
        <footer className="management-footer">
          <span>HUOMO / Recepción</span>
          <span>El buen servicio empieza acá.</span>
        </footer>
      </div>
    </div>
  );
}
