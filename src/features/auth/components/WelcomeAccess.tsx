import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleAccessButton } from './GoogleAccessButton';
import { signInWithGoogle } from '../services/google-sign-in';
import {
  signInUnified,
  signUpClient,
  requestPasswordReset,
  getCurrentUserProfile,
} from '../../staff/services/admin-session';
import '../auth.css';

type AuthTab = 'login' | 'register' | 'recovery';

export function WelcomeAccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<AuthTab>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>(() => location.state?.authError ?? '');
  const [successMsg, setSuccessMsg] = useState('');

  // Supabase can return to Site URL when a provider starts without redirectTo.
  // Initializing the client consumes the PKCE callback before resolving the role.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('error')) return;
    let active = true;
    async function finishAccess() {
      try {
        if (params.has('error')) throw new Error('El acceso con Google fue cancelado.');
        const profile = await getCurrentUserProfile();
        if (!profile) throw new Error('No se pudo validar el acceso. Volvé a ingresar con Google.');
        if (active)
          navigate(
            profile.role === 'admin'
              ? '/admin'
              : profile.role === 'barber'
                ? '/barbero'
                : profile.role === 'reception'
                  ? '/recepcion'
                  : '/cliente',
            { replace: true }
          );
      } catch {
        if (active) {
          setError('No se pudo completar el acceso con Google. Volvé a intentarlo.');
          navigate('/', { replace: true });
        }
      }
    }
    void finishAccess();
    return () => {
      active = false;
    };
  }, [location.search, navigate]);

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await signInWithGoogle();
    } catch {
      setError('No se pudo iniciar el acceso con Google. Revisá tu conexión y reintentá.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const identity = String(data.get('identity') || '');
    const password = String(data.get('password') || '');

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const role = await signInUnified(identity, password);
      form.reset();
      if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'reception') navigate('/recepcion', { replace: true });
      else if (role === 'barber') navigate('/barbero', { replace: true });
      else navigate('/cliente', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const fullName = String(data.get('fullName') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verificalas antes de continuar.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const { requiresEmailConfirmation } = await signUpClient({
        fullName,
        email,
        phone,
        password,
      });

      form.reset();

      if (requiresEmailConfirmation) {
        setSuccessMsg(
          '¡Cuenta creada con éxito! Te enviamos un correo de confirmación a tu casilla. Por favor confirmalo para ingresar.'
        );
      } else {
        // Ingreso automático
        navigate('/cliente', { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      await requestPasswordReset(email);
      setSuccessMsg(
        'Te enviamos un correo con las instrucciones para restablecer tu contraseña. Revisá tu bandeja de entrada.'
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo enviar el correo de recuperación.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="welcome-screen">
      <section className="welcome-story">
        <span className="brand-word">
          HUOMO<span>®</span>
        </span>
        <div className="welcome-story-content">
          <span className="eyebrow">EL OFICIO. EL EQUIPO. EL NEGOCIO.</span>
          <h1>
            Todo en su lugar.
            <br />
            <em>Tu barbería también.</em>
          </h1>
          <p>
            Plataforma unificada para clientes y equipo profesional. Reservá tus turnos en segundos
            o gestioná tu negocio con total precisión.
          </p>
        </div>
        <div className="welcome-story-footer">
          <span>BARBER MANAGEMENT</span>
          <span>•</span>
          <span>EST. HUOMO</span>
        </div>
      </section>

      <section className="welcome-panel">
        <div className="welcome-box">
          <div className="welcome-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              className={`welcome-tab-button ${tab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setTab('login');
                setError('');
                setSuccessMsg('');
              }}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              className={`welcome-tab-button ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setError('');
                setSuccessMsg('');
              }}
            >
              Crear cuenta
            </button>
          </div>

          {error && (
            <div className="welcome-alert-error" role="alert">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="welcome-alert-success" role="status">
              {successMsg}
            </div>
          )}

          {tab === 'login' && (
            <div>
              <div className="welcome-box-header">
                <h2>Bienvenido</h2>
                <p>Ingresá con tu cuenta para acceder a tu portal.</p>
              </div>
              <GoogleAccessButton busy={busy} onClick={() => void handleGoogle()} />
              <form className="welcome-form" onSubmit={handleLogin}>
                <label>
                  Usuario o email
                  <input
                    name="identity"
                    type="text"
                    autoComplete="username"
                    required
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="usuario o email@ejemplo.com"
                  />
                  <span className="welcome-form-help">
                    Clientes ingresan con correo; el personal puede usar su usuario asignado.
                  </span>
                </label>

                <label>
                  Contraseña
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                  />
                </label>

                <button type="submit" className="welcome-action-btn" disabled={busy}>
                  {busy ? 'Verificando acceso…' : 'Ingresar al sistema'}
                </button>

                <button
                  type="button"
                  className="welcome-secondary-btn"
                  onClick={() => {
                    setTab('recovery');
                    setError('');
                    setSuccessMsg('');
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <div className="welcome-box-header">
                <h2>Crear cuenta</h2>
                <p>Completá tus datos para reservar turnos online en Huomo.</p>
              </div>
              <GoogleAccessButton busy={busy} onClick={() => void handleGoogle()} />
              <form className="welcome-form" onSubmit={handleRegister} noValidate>
                <label>
                  Nombre y apellido
                  <input
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Tu nombre completo"
                  />
                </label>

                <label>
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tunombre@email.com"
                  />
                </label>

                <label>
                  Teléfono de contacto (opcional)
                  <input name="phone" type="tel" autoComplete="tel" placeholder="11 1234-5678" />
                </label>

                <label>
                  Contraseña
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>

                <label>
                  Confirmar contraseña
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    placeholder="Repetí tu contraseña"
                  />
                </label>

                <button type="submit" className="welcome-action-btn" disabled={busy}>
                  {busy ? 'Creando cuenta…' : 'Crear mi cuenta'}
                </button>
              </form>
            </div>
          )}

          {tab === 'recovery' && (
            <div>
              <div className="welcome-box-header">
                <h2>Recuperar contraseña</h2>
                <p>Ingresá tu correo electrónico para recibir un enlace de restablecimiento.</p>
              </div>
              <form className="welcome-form" onSubmit={handleRecovery}>
                <label>
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tunombre@email.com"
                  />
                </label>

                <button type="submit" className="welcome-action-btn" disabled={busy}>
                  {busy ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
                </button>

                <button
                  type="button"
                  className="welcome-secondary-btn"
                  onClick={() => {
                    setTab('login');
                    setError('');
                    setSuccessMsg('');
                  }}
                >
                  ← Volver a iniciar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
