import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AdminIcon } from './AdminIcon';
import { APP_ROUTES } from '../../../app/router/routes';

interface AdminShellProps {
  children: ReactNode;
  leaving: boolean;
  logoutError: string;
  onLogout: () => void;
}
export function AdminShell({ children, leaving, logoutError, onLogout }: AdminShellProps) {
  const { pathname } = useLocation();
  return (
    <div className="management-app">
      <a className="skip-link" href="#admin-content">
        Saltar al contenido
      </a>
      <aside className="management-sidebar">
        <div className="sidebar-brand">
          <span className="brand-word">
            HUOMO<span>®</span>
          </span>
          <span>BARBER MANAGEMENT</span>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">H</span>
          <div>
            Huomo Barber<small>Administración</small>
          </div>
          <span className="online-dot" />
        </div>
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav aria-label="Administración" className="management-nav">
          <NavLink to={APP_ROUTES.ADMIN} end>
            <AdminIcon name="dashboard" />
            Resumen
          </NavLink>
          <NavLink to={APP_ROUTES.ADMIN_STAFF}>
            <AdminIcon name="team" />
            Equipo
          </NavLink>
          <NavLink to={APP_ROUTES.ADMIN_SERVICES}>
            <AdminIcon name="scissors" />
            Servicios
          </NavLink>
          <NavLink
            to={APP_ROUTES.ADMIN_BRANCHES}
            className={({ isActive }) =>
              isActive || pathname.startsWith('/sucursal/') ? 'active' : undefined
            }
          >
            <AdminIcon name="branches" />
            Sucursales
          </NavLink>
          <NavLink to={APP_ROUTES.ADMIN_CASH}>
            <AdminIcon name="wallet" />
            Caja
          </NavLink>
          <p className="nav-caption nav-future">PRÓXIMOS MÓDULOS</p>
          <span className="nav-unavailable">
            <AdminIcon name="calendar" />
            Agenda<small>Pronto</small>
          </span>
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-identity">
            <span className="user-avatar">AD</span>
            <div>
              Administrador<small>Gestión del negocio</small>
            </div>
          </div>
          <button className="logout-button" disabled={leaving} onClick={onLogout}>
            <AdminIcon name="logout" />
            {leaving ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
        </div>
      </aside>
      <div className="management-body">
        <header className="management-topbar">
          <div className="breadcrumb">
            Administración <span>/</span>
            <strong>
              {pathname.includes('/personal')
                ? 'Equipo'
                : pathname.includes('/servicios')
                  ? 'Servicios'
                  : pathname.includes('/sucursal')
                    ? 'Sucursales'
                    : pathname.includes('/caja')
                      ? 'Caja'
                      : 'Resumen'}
            </strong>
          </div>
          <div className="topbar-account">
            <span className="online-dot" />
            Sesión de administrador<span className="user-avatar">AD</span>
          </div>
        </header>
        <main id="admin-content" className="management-content">
          {children}
        </main>
        <footer className="management-footer">
          <span>
            HUOMO <span className="footer-muted">/ Administración</span>
          </span>
          <span>Tu negocio, en orden.</span>
        </footer>
      </div>
    </div>
  );
}
