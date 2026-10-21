import type { BarberProfile, BarberSection } from '../../features/barber/components/model';
import { useEffect, useState } from 'react';
import { AdminAccess } from '../../features/staff/components/AdminAccess';
import { onSessionChange, signOutAdmin } from '../../features/staff/services/admin-session';
import { requireSupabaseClient } from '../../integrations/supabase/client';
import '../../features/admin/admin.css';
import { BarberDashboard } from '../../features/barber/dashboard/BarberDashboard';
import { BarberShell } from '../../features/barber/components/BarberShell';
export function BarberLayout() {
  const [section, setSection] = useState<BarberSection>('overview');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    profile?: BarberProfile;
    guest?: boolean;
    error?: string;
  }>();
  const [logoutError, setLogoutError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function check() {
      const request = ++generation;
      try {
        const client = requireSupabaseClient();
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!session) {
          if (active && request === generation) setState({ guest: true });
          return;
        }
        const { data, error } = await client.rpc('get_barber_portal');
        if (error) throw new Error(error.message);
        if (active && request === generation)
          setState({ profile: data as unknown as BarberProfile });
      } catch (cause) {
        if (active && request === generation)
          setState({
            error: cause instanceof Error ? cause.message : 'No se pudo verificar tu acceso.',
          });
      }
    }
    void check();
    let unsubscribe = () => {};
    try {
      unsubscribe = onSessionChange(() => {
        if (active) void check();
      });
    } catch {
      /* check reports errors */
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [revision]);
  async function logout() {
    setBusy(true);
    setLogoutError('');
    try {
      await signOutAdmin();
      setRevision(value => value + 1);
    } catch {
      setLogoutError('No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  }
  if (!state)
    return (
      <main className="admin-loading">
        <p role="status">Verificando acceso…</p>
      </main>
    );
  if (state.guest) return <AdminAccess onSuccess={() => setRevision(value => value + 1)} />;
  if (!state.profile)
    return (
      <main className="admin-loading">
        <h1>No pudimos abrir tu espacio</h1>
        <p role="alert">{state.error}</p>
        <button className="action-secondary" onClick={() => setRevision(value => value + 1)}>
          Reintentar acceso
        </button>
        <button className="text-button" disabled={busy} onClick={() => void logout()}>
          Cerrar sesión
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </main>
    );
  return (
    <BarberShell
      profile={state.profile}
      section={section}
      onNavigate={setSection}
      leaving={busy}
      logoutError={logoutError}
      onLogout={() => void logout()}
    >
      <BarberDashboard key={state.profile.id} employeeId={state.profile.id} section={section} />
    </BarberShell>
  );
}
