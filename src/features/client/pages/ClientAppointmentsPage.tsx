import { useEffect, useState } from 'react';
import {
  getClientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
  getBookingSettings,
} from '../../appointments/services/appointments-service';
import type { Appointment, BookingSettings, BookingSlot } from '../../appointments/model/types';
import { formatCurrency } from '../../../shared/utils/currency';

export function ClientAppointmentsPage() {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<BookingSettings | null>(null);

  // Modales
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);

  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const rules = await getBookingSettings();
        setSettings(rules);
      } catch {
        /* fallback */
      }
    }
    void loadSettings();
  }, []);

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchAppointments() {
      try {
        const res = await getClientAppointments(tab, page);
        if (active) {
          setAppointments(res.items);
          setTotal(res.total);
          setHasMore(res.hasMore);
          setError('');
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los turnos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchAppointments();
    return () => {
      active = false;
    };
  }, [tab, page, revision]);

  function handleTabChange(nextTab: 'upcoming' | 'history') {
    setTab(nextTab);
    setPage(1);
    setLoading(true);
  }

  // Cancelar
  async function submitCancel() {
    if (!cancellingAppt) return;
    setCancelBusy(true);
    setError('');
    try {
      await cancelAppointment(cancellingAppt.id, cancelReason);
      setCancellingAppt(null);
      setCancelReason('');
      setRevision(r => r + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar el turno.');
    } finally {
      setCancelBusy(false);
    }
  }

  // Reprogramar: cargar slots al cambiar fecha
  async function loadRescheduleSlots(date: string) {
    if (!reschedulingAppt || !date) return;
    setRescheduleLoadingSlots(true);
    try {
      const data = await getAvailableSlots(
        reschedulingAppt.branchId,
        reschedulingAppt.serviceId,
        reschedulingAppt.barberId,
        date
      );
      setRescheduleSlots(data);
      setSelectedSlot(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al cargar horarios.');
    } finally {
      setRescheduleLoadingSlots(false);
    }
  }

  async function submitReschedule() {
    if (!reschedulingAppt || !selectedSlot) return;
    setRescheduleBusy(true);
    setError('');
    try {
      await rescheduleAppointment(reschedulingAppt.id, selectedSlot.startsAt);
      setReschedulingAppt(null);
      setSelectedSlot(null);
      setRevision(r => r + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo reprogramar el turno.');
    } finally {
      setRescheduleBusy(false);
    }
  }

  const cancelLimitHours = settings?.cancelLimitHours ?? 2;
  const [nowTimestamp] = useState(() => Date.now());

  function canCancelOrReschedule(startsAtIso: string): boolean {
    const diffMs = new Date(startsAtIso).getTime() - nowTimestamp;
    const hours = diffMs / (1000 * 60 * 60);
    return hours >= cancelLimitHours;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Mis turnos
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
          Consultá el estado de tus reservas, reprogramá horarios o revisá tu historial.
        </p>
      </div>

      {/* Tabs */}
      <div className="welcome-tabs" style={{ maxWidth: '380px' }} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          className={`welcome-tab-button ${tab === 'upcoming' ? 'active' : ''}`}
          onClick={() => handleTabChange('upcoming')}
        >
          Próximos turnos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`welcome-tab-button ${tab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          Historial
        </button>
      </div>

      {error && (
        <div className="welcome-alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
      {loading && <p style={{ color: '#9ca3af' }}>Cargando reservas…</p>}

      {!loading && appointments.length === 0 && (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: '#15181e',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>
            {tab === 'upcoming'
              ? 'No tenés turnos próximos agendados.'
              : 'Aún no tenés historial de turnos.'}
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            {tab === 'upcoming'
              ? 'Podés solicitar un nuevo turno desde la sección Reservar.'
              : 'Los turnos que completes o canceles se mostrarán aquí.'}
          </p>
        </div>
      )}

      {/* Listado de turnos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {appointments.map(appt => {
          const eligibleForActions =
            appt.status === 'confirmed' && canCancelOrReschedule(appt.startsAt);
          return (
            <article
              key={appt.id}
              style={{
                padding: '1.5rem',
                background: '#15181e',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {appt.serviceName}
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                    Sucursal {appt.branchName} • Barbero: {appt.barberName}
                  </span>
                </div>
                <span className={`status-badge ${appt.status}`}>
                  {formatStatusLabel(appt.status)}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  background: '#0e1013',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    Fecha y Hora
                  </span>
                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                    {formatDate(appt.startsAt)}
                  </strong>
                  <div style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                    {formatTime(appt.startsAt)} hs ({appt.durationMinutes} min)
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    Importe acordado
                  </span>
                  <strong style={{ color: '#c59b27', fontSize: '1.05rem' }}>
                    {formatCurrency(appt.priceCents)}
                  </strong>
                  <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Abono en sucursal</div>
                </div>

                {appt.notes && (
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        display: 'block',
                      }}
                    >
                      Notas
                    </span>
                    <span style={{ color: '#d1d5db', fontSize: '0.88rem' }}>{appt.notes}</span>
                  </div>
                )}
              </div>

              {appt.cancellationReason && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: '6px',
                    border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: '0.85rem',
                    color: '#fca5a5',
                  }}
                >
                  <strong>Motivo de anulación:</strong> {appt.cancellationReason}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="welcome-secondary-btn"
                  onClick={() => setDetailAppt(appt)}
                >
                  Ver comprobante completo
                </button>

                {appt.status === 'confirmed' && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="client-logout-btn"
                      disabled={!eligibleForActions}
                      title={
                        !eligibleForActions
                          ? `Cancelación permitida hasta ${cancelLimitHours}hs antes`
                          : ''
                      }
                      onClick={() => setCancellingAppt(appt)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="welcome-action-btn"
                      style={{ marginTop: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      disabled={!eligibleForActions}
                      title={
                        !eligibleForActions
                          ? `Reprogramación permitida hasta ${cancelLimitHours}hs antes`
                          : ''
                      }
                      onClick={() => {
                        setReschedulingAppt(appt);
                        setRescheduleDate(appt.startsAt.slice(0, 10));
                        void loadRescheduleSlots(appt.startsAt.slice(0, 10));
                      }}
                    >
                      Reprogramar
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Paginación (Máximo 20 por página) */}
      {total > 20 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '2rem',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '0.88rem' }}>
            Página {page} de {Math.ceil(total / 20)} (Total: {total} registros)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="client-logout-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="client-logout-btn"
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELACIÓN */}
      {cancellingAppt && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal">
            <h2>Cancelar turno</h2>
            <p>
              ¿Estás seguro de que querés cancelar tu turno de{' '}
              <strong>{cancellingAppt.serviceName}</strong> para el{' '}
              {formatDate(cancellingAppt.startsAt)} a las {formatTime(cancellingAppt.startsAt)} hs?
            </p>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                marginBottom: '1.5rem',
                color: '#d1d5db',
                fontSize: '0.88rem',
              }}
            >
              Motivo de la cancelación (opcional):
              <input
                type="text"
                value={cancelReason}
                maxLength={200}
                placeholder="ej: Imprevisto laboral, reprogramación personal…"
                onChange={e => setCancelReason(e.target.value)}
                style={{
                  padding: '0.75rem',
                  background: '#0e1013',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: '#fff',
                }}
              />
            </label>

            <div className="huomo-modal-actions">
              <button
                type="button"
                className="welcome-secondary-btn"
                disabled={cancelBusy}
                onClick={() => setCancellingAppt(null)}
              >
                Volver
              </button>
              <button
                type="button"
                className="client-logout-btn"
                style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.5)' }}
                disabled={cancelBusy}
                onClick={() => void submitCancel()}
              >
                {cancelBusy ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPROGRAMACIÓN */}
      {reschedulingAppt && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal" style={{ maxWidth: '580px' }}>
            <h2>Reprogramar turno</h2>
            <p>
              Elegí un nuevo día y horario disponible con{' '}
              <strong>{reschedulingAppt.barberName}</strong> en la sucursal{' '}
              <strong>{reschedulingAppt.branchName}</strong>. Si la operación falla, se conservará
              tu turno actual.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#d1d5db',
                  fontSize: '0.9rem',
                }}
              >
                Nueva fecha:
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => {
                    setRescheduleDate(e.target.value);
                    void loadRescheduleSlots(e.target.value);
                  }}
                  style={{
                    padding: '0.6rem 0.8rem',
                    background: '#0e1013',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                />
              </label>
            </div>

            {rescheduleLoadingSlots && <p style={{ color: '#9ca3af' }}>Consultando horarios…</p>}

            {!rescheduleLoadingSlots && rescheduleSlots.length === 0 && (
              <p style={{ color: '#f87171', fontSize: '0.9rem' }}>
                No hay horarios disponibles para esta fecha. Elegí otro día.
              </p>
            )}

            <div
              className="slots-grid"
              style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1.5rem' }}
            >
              {rescheduleSlots.map(slot => (
                <button
                  type="button"
                  key={slot.startsAt}
                  className={`slot-button ${selectedSlot?.startsAt === slot.startsAt ? 'selected' : ''}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot.timeDisplay}
                </button>
              ))}
            </div>

            <div className="huomo-modal-actions">
              <button
                type="button"
                className="welcome-secondary-btn"
                disabled={rescheduleBusy}
                onClick={() => setReschedulingAppt(null)}
              >
                Volver
              </button>
              <button
                type="button"
                className="welcome-action-btn"
                style={{ marginTop: 0 }}
                disabled={!selectedSlot || rescheduleBusy}
                onClick={() => void submitReschedule()}
              >
                {rescheduleBusy ? 'Guardando nuevo horario…' : 'Confirmar reprogramación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE INDIVIDUAL */}
      {detailAppt && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal">
            <h2>Detalle del turno</h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="wizard-summary-row">
                <span>Identificador</span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{detailAppt.id}</span>
              </div>
              <div className="wizard-summary-row">
                <span>Servicio</span>
                <span>
                  {detailAppt.serviceName} ({detailAppt.durationMinutes} min)
                </span>
              </div>
              <div className="wizard-summary-row">
                <span>Sucursal</span>
                <span>{detailAppt.branchName}</span>
              </div>
              <div className="wizard-summary-row">
                <span>Barbero</span>
                <span>{detailAppt.barberName}</span>
              </div>
              <div className="wizard-summary-row">
                <span>Horario fijado</span>
                <span>
                  {formatDate(detailAppt.startsAt)} - {formatTime(detailAppt.startsAt)} hs
                </span>
              </div>
              <div className="wizard-summary-row total">
                <span>Precio convenido</span>
                <span>{formatCurrency(detailAppt.priceCents)}</span>
              </div>
              <div className="wizard-summary-row">
                <span>Estado</span>
                <span className={`status-badge ${detailAppt.status}`}>
                  {formatStatusLabel(detailAppt.status)}
                </span>
              </div>
              {detailAppt.notes && (
                <div className="wizard-summary-row">
                  <span>Notas</span>
                  <span>{detailAppt.notes}</span>
                </div>
              )}
            </div>

            <div className="huomo-modal-actions">
              <button
                type="button"
                className="welcome-action-btn"
                style={{ marginTop: 0 }}
                onClick={() => setDetailAppt(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatStatusLabel(st: string): string {
  switch (st) {
    case 'confirmed':
      return 'Confirmado';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    case 'no_show':
      return 'Ausente';
    default:
      return st;
  }
}
