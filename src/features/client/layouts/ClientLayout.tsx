import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  getCurrentUserProfile,
  signOutAdmin,
  onSessionChange,
} from '../../staff/services/admin-session';
import type { ClientProfile } from '../../appointments/model/types';
import { NativeBridge } from '../../../shared/native/NativeBridge';
import '../client.css';

export function ClientLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const callback = new URL(window.location.href);
        if (
          callback.searchParams.has('error') ||
          new URLSearchParams(callback.hash.slice(1)).has('error')
        ) {
          navigate('/', {
            replace: true,
            state: {
              authError: 'El acceso con Google fue cancelado o no se pudo completar. Reintentá.',
            },
          });
          return;
        }
        const user = await getCurrentUserProfile();
        if (active) {
          if (!user) {
            navigate('/', { replace: true });
            return;
          }
          if (user.role !== 'client') {
            navigate(
              user.role === 'admin' ? '/admin' : user.role === 'barber' ? '/barbero' : '/recepcion',
              { replace: true }
            );
            return;
          }
          setProfile(user);
        }
      } catch {
        if (active) navigate('/', { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const unsubscribe = onSessionChange(() => {
      if (active) void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  async function handleLogout() {
    try {
      await signOutAdmin();
      navigate('/', { replace: true });
    } catch {
      // Ignorar error de red al salir
      navigate('/', { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="client-layout">
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <p role="status" style={{ color: '#9ca3af' }}>
            Cargando tu espacio…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="client-layout">
      <NativeBridge />
      <header className="client-header">
        <NavLink to="/cliente" className="client-brand">
          <span className="client-brand-word">
            HUOMO<span>®</span>
          </span>
          <span className="client-brand-badge">HuomoClub</span>
        </NavLink>

        <nav className="client-nav" aria-label="Portal de Clientes">
          <NavLink
            to="/cliente"
            end
            className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/cliente/reservar"
            className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
          >
            Reservar
          </NavLink>
          <NavLink
            to="/cliente/turnos"
            className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
          >
            Mis turnos
          </NavLink>
          <NavLink
            to="/cliente/sucursales"
            className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
          >
            Sucursales
          </NavLink>
          <NavLink
            to="/cliente/perfil"
            className={({ isActive }) => `client-nav-link ${isActive ? 'active' : ''}`}
          >
            Mi perfil
          </NavLink>
        </nav>

        <div className="client-user-bar">
          <span className="client-user-greeting">
            Hola, <strong>{profile?.fullName || 'Cliente'}</strong>
          </span>
          <button type="button" className="client-logout-btn" onClick={() => void handleLogout()}>
            Salir
          </button>
        </div>
      </header>

      <main className="client-main">
        <Outlet context={{ profile, refreshProfile: () => {} }} />
      </main>
    </div>
  );
}
