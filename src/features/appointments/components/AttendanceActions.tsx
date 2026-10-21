import { useNow } from '../../../shared/hooks/useNow';
import { useState } from 'react';
import { markAppointmentAttendance } from '../services/appointments-service';
import type { Appointment } from '../model/types';
export function AttendanceActions({
  appointment,
  onSaved,
}: {
  appointment: Appointment;
  onSaved: () => void;
}) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function update(action: 'arrived' | 'no_show') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await markAppointmentAttendance(appointment.id, action);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la asistencia.');
    } finally {
      setBusy(false);
    }
  }
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const isToday = day.format(new Date(appointment.startsAt)) === day.format(new Date());
  return (
    <div className="form-actions">
      {isToday && !appointment.arrivedAt && (
        <button
          type="button"
          className="action-secondary"
          disabled={busy}
          onClick={() => void update('arrived')}
        >
          Registrar llegada
        </button>
      )}
      {appointment.arrivedAt ? (
        <span>Cliente presente</span>
      ) : (
        new Date(appointment.endsAt).getTime() <= now && (
          <button
            type="button"
            className="action-secondary"
            disabled={busy}
            onClick={() => void update('no_show')}
          >
            Marcar ausente
          </button>
        )
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
