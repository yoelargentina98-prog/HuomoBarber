import { useState, type FormEvent } from 'react';
import { signInAdmin } from '../services/admin-session';
import { useNavigate } from 'react-router-dom';

export function AdminAccess({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError('');
    try {
      const role = await signInAdmin(String(fields.get('email')), String(fields.get('password')));
      form.reset();
      if (role === 'reception') navigate('/recepcion', { replace: true });
      else if (role === 'barber') navigate('/barbero', { replace: true });
      else if (role === 'client') navigate('/cliente', { replace: true });
      else onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo ingresar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-access">
      <section className="access-story">
        <span className="brand-word">
          HUOMO<span>®</span>
        </span>
        <div>
          <span className="eyebrow">EL OFICIO. EL EQUIPO. EL NEGOCIO.</span>
          <h1>
            Todo en su lugar.
            <br />
            <em>Tu barbería también.</em>
          </h1>
          <p>Un espacio para organizar tu equipo y acompañar el día a día de tu negocio.</p>
        </div>
        <span className="access-story-footer">
          BARBER MANAGEMENT <span>EST. HUOMO</span>
        </span>
      </section>
      <section className="access-panel">
        <form className="access-form" onSubmit={submit}>
          <span className="eyebrow">ESPACIO PRIVADO</span>
          <h2>Administración</h2>
          <p>Ingresá con tu cuenta para continuar.</p>
          <label>
            Usuario o email
            <input
              name="email"
              type="text"
              autoComplete="username"
              required
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Tu usuario o email"
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Tu contraseña"
            />
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="action-primary" type="submit" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar al sistema'}
            <span aria-hidden="true">→</span>
          </button>
          <p className="access-note">Ingresás al espacio correspondiente a tu cuenta.</p>
        </form>
        <span className="access-copyright">© {new Date().getFullYear()} Huomo Barber</span>
      </section>
    </main>
  );
}
