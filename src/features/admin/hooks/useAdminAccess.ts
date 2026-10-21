import { useEffect, useState } from 'react';
import { hasAdminSession, onSessionChange } from '../../staff/services/admin-session';

export function useAdminAccess() {
  const [status, setStatus] = useState<'loading' | 'admin' | 'guest' | 'error'>('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function check() {
      const current = ++generation;
      // Preserve the login form during Auth events so failed role validation
      // does not unmount it and erase its error message.
      try {
        const allowed = await hasAdminSession();
        if (active && current === generation) {
          setStatus(allowed ? 'admin' : 'guest');
          setError('');
        }
      } catch (cause) {
        if (active && current === generation) {
          setStatus('error');
          setError(cause instanceof Error ? cause.message : 'No se pudo verificar el acceso.');
        }
      }
    }
    void check();
    let unsubscribe = () => {};
    try {
      unsubscribe = onSessionChange(() => {
        if (active) void check();
      });
    } catch {
      /* check informa el error. */
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [revision]);
  return { status, error, retry: () => setRevision(previous => previous + 1) };
}
