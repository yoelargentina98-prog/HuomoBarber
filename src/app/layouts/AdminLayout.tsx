import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AdminShell } from '../../features/admin/components/AdminShell';
import { useAdminAccess } from '../../features/admin/hooks/useAdminAccess';
import { AdminAccess } from '../../features/staff/components/AdminAccess';
import { StaffProvider } from '../../features/staff/components/StaffProvider';
import { signOutAdmin } from '../../features/staff/services/admin-session';
import '../../features/admin/admin.css';

export function AdminLayout() {
  const access = useAdminAccess();
  const [logoutError, setLogoutError] = useState('');
  const [leaving, setLeaving] = useState(false);

  if (access.status === 'loading')
    return (
      <main className="admin-loading">
        <span className="brand-word">
          HUOMO<span>®</span>
        </span>
        <p role="status">Preparando tu espacio de trabajo…</p>
      </main>
    );
  if (access.status === 'error')
    return (
      <main className="admin-loading">
        <h1>No pudimos verificar tu acceso</h1>
        <p role="alert">{access.error}</p>
        <button className="action-primary" onClick={access.retry}>
          Volver a intentar
        </button>
      </main>
    );
  if (access.status === 'guest') return <AdminAccess onSuccess={access.retry} />;
  async function logout() {
    setLeaving(true);
    setLogoutError('');
    try {
      await signOutAdmin();
      access.retry();
    } catch {
      setLogoutError('No se pudo cerrar la sesión. Intentá nuevamente.');
    } finally {
      setLeaving(false);
    }
  }
  return (
    <StaffProvider>
      <AdminShell leaving={leaving} logoutError={logoutError} onLogout={() => void logout()}>
        <Outlet />
      </AdminShell>
    </StaffProvider>
  );
}
