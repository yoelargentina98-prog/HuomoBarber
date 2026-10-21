import { MemberCard } from '../../club/MemberCard';
import { useOutletContext } from 'react-router-dom';
import type { ClientProfile } from '../../appointments/model/types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientAppointments } from '../../appointments/services/appointments-service';
import type { Appointment } from '../../appointments/model/types';
import { formatCurrency } from '../../../shared/utils/currency';

export function ClientHomePage() {
  const { profile } = useOutletContext<{ profile: ClientProfile | null }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { items } = await getClientAppointments('upcoming', 1);
        if (active) setAppointments(items);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'No se pudieron cargar tus próximos turnos.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const nextAppointment = appointments[0];
  const otherAppointments = appointments.slice(1);

  return (
    <div>
      <section className="client-hero">
        <h1>Tu espacio personal</h1>
        <p>Gestioná tus turnos, reservá un nuevo horario y encontrá tu estilo en Huomo.</p>
      </section>

      <MemberCard number={profile?.customerNumber} />
      {/* Acceso destacado a reservar */}
      <section className="client-cta-card">
        <div className="client-cta-content">
          <h2>¿Listo para tu próximo corte?</h2>
          <p>
            Elegí tu sucursal, tu servicio favorito y el barbero de tu preferencia en simples pasos.
          </p>
        </div>
        <Link to="/cliente/reservar" className="client-cta-button">
          Reservar turno →
        </Link>
      </section>

      {loading && <p style={{ color: '#9ca3af' }}>Cargando tus turnos…</p>}
      {error && (
        <div className="welcome-alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Próximo Turno Destacado */}
      {!loading && nextAppointment && (
        <section className="client-next-appt">
          <div className="client-next-header">
            <span className="client-next-badge">
              <span>●</span> Próximo turno confirmado
            </span>
            <span className="status-badge confirmed">Confirmado</span>
          </div>

          <div className="client-next-details">
            <div className="client-detail-col">
              <span className="client-detail-label">Servicio</span>
              <span className="client-detail-val">{nextAppointment.serviceName}</span>
              <span className="client-detail-sub">{nextAppointment.durationMinutes} minutos</span>
            </div>

            <div className="client-detail-col">
              <span className="client-detail-label">Fecha y Hora</span>
              <span className="client-detail-val">
                {formatAppointmentDate(nextAppointment.startsAt)}
              </span>
              <span className="client-detail-sub">
                {formatAppointmentTime(nextAppointment.startsAt)} hs
              </span>
            </div>

            <div className="client-detail-col">
              <span className="client-detail-label">Barbero & Sucursal</span>
              <span className="client-detail-val">{nextAppointment.barberName}</span>
              <span className="client-detail-sub">Sucursal {nextAppointment.branchName}</span>
            </div>

            <div className="client-detail-col">
              <span className="client-detail-label">Importe</span>
              <span className="client-detail-val" style={{ color: '#c59b27' }}>
                {formatCurrency(nextAppointment.priceCents)}
              </span>
              <span className="client-detail-sub">Abonás en el local</span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/cliente/turnos" className="welcome-secondary-btn">
              Ver detalles y gestionar mis turnos →
            </Link>
          </div>
        </section>
      )}

      {/* Sin turnos programados */}
      {!loading && !nextAppointment && (
        <section
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: '#15181e',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '2.5rem',
          }}
        >
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.4rem' }}>
            No tenés turnos próximos agendados
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
            Hacé clic en Reservar turno para asegurar tu lugar con tu barbero favorito.
          </p>
          <Link
            to="/cliente/reservar"
            className="client-cta-button"
            style={{ display: 'inline-flex' }}
          >
            Elegir horario
          </Link>
        </section>
      )}

      {/* Resumen de otras reservas próximas */}
      {otherAppointments.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
            Otros turnos agendados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {otherAppointments.map(appt => (
              <div
                key={appt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: '#15181e',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <strong style={{ color: '#fff', display: 'block', fontSize: '1rem' }}>
                    {appt.serviceName} con {appt.barberName}
                  </strong>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    {formatAppointmentDate(appt.startsAt)} a las{' '}
                    {formatAppointmentTime(appt.startsAt)} hs • Sucursal {appt.branchName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 700, color: '#c59b27' }}>
                    {formatCurrency(appt.priceCents)}
                  </span>
                  <Link to="/cliente/turnos" style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    Ver →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatAppointmentDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatAppointmentTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
