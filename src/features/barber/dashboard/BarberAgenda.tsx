import { useEffect, useState } from 'react';
import { getBarberAppointments } from '../../appointments/services/appointments-service';
import type { Appointment } from '../../appointments/model/types';

export function BarberAgenda() {
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getBarberAppointments(selectedDate);
        if (active) setAppointments(data);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Error al cargar tu agenda.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedDate]);

  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MI ESPACIO DE TRABAJO</span>
          <h2>Mi agenda de turnos</h2>
          <p className="employee-help">
            Turnos asignados a tu sillón con los detalles del cliente para brindar el mejor
            servicio.
          </p>
        </div>
        <label
          style={{
            fontSize: '0.88rem',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Día:
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              background: '#0e1013',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              color: '#fff',
            }}
          />
        </label>
      </div>

      {error && (
        <div className="welcome-alert-error" role="alert" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}
      {loading && <p style={{ color: '#9ca3af' }}>Cargando tus turnos…</p>}

      {!loading && appointments.length === 0 && (
        <p className="empty-copy">
          No tenés turnos programados para el{' '}
          {new Date(`${selectedDate}T12:00:00-03:00`).toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'America/Argentina/Buenos_Aires',
          })}
          .
        </p>
      )}

      {!loading && appointments.length > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}
        >
          {appointments.map(appt => (
            <div
              key={appt.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: '#15181e',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <strong style={{ color: '#c59b27', fontSize: '1.15rem' }}>
                    {formatTime(appt.startsAt)} - {formatTime(appt.endsAt)} hs
                  </strong>
                  <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{appt.clientName}</strong>
                  <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                </div>

                <div style={{ color: '#9ca3af', fontSize: '0.88rem' }}>
                  <strong style={{ color: '#d1d5db' }}>{appt.serviceName}</strong> (
                  {appt.durationMinutes} min)
                  {appt.clientPhone && (
                    <span>
                      {' '}
                      • Teléfono del cliente:{' '}
                      <a href={`tel:${appt.clientPhone}`} style={{ color: '#c59b27' }}>
                        {appt.clientPhone}
                      </a>
                    </span>
                  )}
                </div>

                {appt.notes && (
                  <div
                    style={{
                      marginTop: '0.35rem',
                      color: '#e5c468',
                      fontSize: '0.82rem',
                      fontStyle: 'italic',
                    }}
                  >
                    Nota: "{appt.notes}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
