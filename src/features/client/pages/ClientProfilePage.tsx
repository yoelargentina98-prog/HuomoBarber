import { MemberCard } from '../../club/MemberCard';
import { ClubHistoryPanel } from '../../club/ClubHistoryPanel';
import '../../club/club.css';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUserProfile,
  updateClientProfile,
  requestPasswordReset,
  signOutAdmin,
} from '../../staff/services/admin-session';
import type { ClientProfile } from '../../appointments/model/types';

export function ClientProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const u = await getCurrentUserProfile();
        if (active && u) {
          setProfile(u);
          setFullName(u.fullName);
          setPhone(u.phone);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Error al cargar perfil.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateClientProfile({ fullName, phone });
      setSuccess('¡Tus datos fueron actualizados correctamente!');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los cambios.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!profile?.email) return;
    setBusy(true);
    setError('');
    setResetSuccess('');
    try {
      await requestPasswordReset(profile.email);
      setResetSuccess(
        `Enviamos un correo a ${profile.email} con las instrucciones para cambiar tu contraseña.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo enviar el correo de recuperación.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await signOutAdmin();
      navigate('/', { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  }

  if (loading) return <p style={{ color: '#9ca3af' }}>Cargando perfil…</p>;

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Mi perfil
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
          Consultá y modificá tus datos personales o gestioná el acceso a tu cuenta.
        </p>
      </div>

      <MemberCard number={profile?.customerNumber} />
      <ClubHistoryPanel />
      {error && (
        <div className="welcome-alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="welcome-alert-success" role="status" style={{ marginBottom: '1.5rem' }}>
          {success}
        </div>
      )}
      {resetSuccess && (
        <div className="welcome-alert-success" role="status" style={{ marginBottom: '1.5rem' }}>
          {resetSuccess}
        </div>
      )}

      <div
        style={{
          background: '#15181e',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '2rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '1.25rem' }}>
          Datos personales
        </h2>

        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              color: '#d1d5db',
              fontSize: '0.88rem',
            }}
          >
            Correo electrónico (acceso a la cuenta)
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              style={{
                padding: '0.8rem',
                background: '#0e1013',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                color: '#6b7280',
                cursor: 'not-allowed',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              color: '#d1d5db',
              fontSize: '0.88rem',
            }}
          >
            Nombre y apellido
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              style={{
                padding: '0.8rem',
                background: '#0e1013',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              color: '#d1d5db',
              fontSize: '0.88rem',
            }}
          >
            Teléfono de contacto
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="11 1234-5678"
              style={{
                padding: '0.8rem',
                background: '#0e1013',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </label>

          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="welcome-action-btn"
              disabled={busy}
              style={{ width: 'auto', padding: '0.75rem 1.75rem' }}
            >
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Seguridad y Acceso */}
      <div
        style={{
          background: '#15181e',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>
          Seguridad y acceso
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Para modificar tu contraseña te enviaremos un enlace seguro a tu correo electrónico.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <button
            type="button"
            className="client-logout-btn"
            disabled={busy}
            onClick={() => void handleResetPassword()}
          >
            Cambiar mi contraseña
          </button>

          <button
            type="button"
            className="client-logout-btn"
            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={() => void handleLogout()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
