import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SaveForm } from '../../../shared/components/SaveForm';
import { hasRecoverySession, saveRecoveredPassword } from '../services/password-recovery';
import '../auth.css';
import '../../../styles/forms.css';
import './password-recovery.css';

export function PasswordRecovery() {
  const [access, setAccess] = useState<'loading' | 'ready' | 'expired'>('loading');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    hasRecoverySession()
      .then(valid => {
        if (active) setAccess(valid ? 'ready' : 'expired');
      })
      .catch(() => {
        if (active) setAccess('expired');
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="password-recovery">
      <section className="password-recovery__card">
        <h1>Restablecer contraseña</h1>
        {access === 'loading' ? (
          <p role="status">Verificando enlace…</p>
        ) : saved ? (
          <p role="status">Contraseña actualizada. Ya podés iniciar sesión.</p>
        ) : access === 'expired' ? (
          <p role="alert">
            El enlace venció o no es válido. Volvé al inicio y solicitá otro desde Recuperar acceso.
          </p>
        ) : (
          <SaveForm
            label="Guardar nueva contraseña"
            onSaved={() => setSaved(true)}
            save={data =>
              saveRecoveredPassword(
                String(data.get('password') ?? ''),
                String(data.get('confirmation') ?? '')
              )
            }
          >
            <label>
              Nueva contraseña
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                required
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                required
              />
            </label>
          </SaveForm>
        )}
        <Link className="text-link" to="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
