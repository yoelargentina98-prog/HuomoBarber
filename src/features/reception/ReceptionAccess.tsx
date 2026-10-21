import { useState, type FormEvent } from 'react';
import { requireSupabaseClient } from '../../integrations/supabase/client';
import { cashOperator } from '../cash/sales/service';
import { loginEmail } from '../staff/services/login-identity';
export function ReceptionAccess({ onSuccess }: { onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const client = requireSupabaseClient();
      const username = String(data.get('username')).trim().toLowerCase();
      const { error } = await client.auth.signInWithPassword({
        email: loginEmail(username),
        password: String(data.get('password')),
      });
      if (error) throw new Error('Revisá el usuario y la contraseña.');
      const operator = await cashOperator();
      if (!operator) throw new Error('No se pudo verificar la sesión.');
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo ingresar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-loading">
      <form className="access-form" onSubmit={submit}>
        <span className="brand-word">HUOMO</span>
        <h1>Recepción</h1>
        <p>Ingresá con tu usuario para abrir la caja de tu sucursal.</p>
        <label>
          Usuario
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="action-primary" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar a recepción'}
        </button>
      </form>
    </main>
  );
}
