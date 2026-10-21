import { useState } from 'react';
import { ReceptionWorkspace } from '../../features/reception/workspace/ReceptionWorkspace';
import { ReceptionAccess } from '../../features/reception/ReceptionAccess';
import { useReceptionAccess } from '../../features/reception/useReceptionAccess';
import { signOutAdmin } from '../../features/staff/services/admin-session';
import '../../features/admin/admin.css';
export function ReceptionLayout() {
  const access = useReceptionAccess();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await signOutAdmin();
      access.retry();
    } catch {
      setError('No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  }
  if (access.loading)
    return (
      <main className="admin-loading">
        <p role="status">Verificando acceso a recepción…</p>
      </main>
    );
  if (access.error)
    return (
      <main className="admin-loading">
        <h1>Acceso a recepción</h1>
        <p role="alert">{access.error}</p>
        <button className="action-secondary" onClick={access.retry}>
          Reintentar acceso
        </button>
        <button className="text-button" disabled={busy} onClick={() => void logout()}>
          Cerrar sesión
        </button>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  if (!access.operator) return <ReceptionAccess onSuccess={access.retry} />;
  return (
    <ReceptionWorkspace
      key={`${access.operator.role}/${access.operator.branchId}`}
      operator={access.operator}
      busy={busy}
      error={error}
      onLogout={() => void logout()}
    />
  );
}
