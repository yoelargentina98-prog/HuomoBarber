import { useEffect, useState } from 'react';
import {
  getBranchAppointments,
  getAvailableServices,
  getAvailableBarbers,
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  completeAppointmentService,
} from '../../appointments/services/appointments-service';
import type {
  Appointment,
  AppointmentStatus,
  BookingSlot,
  PublicBarber,
} from '../../appointments/model/types';
import { formatCurrency } from '../../../shared/utils/currency';

export function ReceptionAgenda({
  branchId,
  branchName,
}: {
  branchId: string;
  branchName: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');

  // Modal Reserva Manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [services, setServices] = useState<Array<{ id: string; name: string; priceCents: number }>>(
    []
  );
  const [selectedService, setSelectedService] = useState('');
  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  // Modal Cobro / Completar
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [completeBusy, setCompleteBusy] = useState(false);

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchAppointments() {
      try {
        const res = await getBranchAppointments({
          branchId,
          dateStr: selectedDate,
          status: statusFilter,
          page: 1,
        });
        if (active) {
          setAppointments(res.items);
          setTotal(res.total);
          setError('');
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Error al cargar turnos de la sucursal.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchAppointments();
    return () => {
      active = false;
    };
  }, [branchId, selectedDate, statusFilter, revision]);

  // Cargar servicios de la sucursal
  useEffect(() => {
    if (!branchId) return;
    void getAvailableServices(branchId).then(setServices);
  }, [branchId]);

  // Cargar barberos cuando cambia el servicio
  useEffect(() => {
    if (!branchId || !selectedService) return;
    void getAvailableBarbers(branchId, selectedService).then(setBarbers);
  }, [branchId, selectedService]);

  // Cargar slots cuando cambia el barbero
  useEffect(() => {
    if (!branchId || !selectedService || !selectedBarber || !selectedDate) return;
    void getAvailableSlots(branchId, selectedService, selectedBarber, selectedDate).then(setSlots);
  }, [branchId, selectedService, selectedBarber, selectedDate]);

  async function handleManualBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedSlot || !clientName.trim()) {
      setError('Completá los datos obligatorios.');
      return;
    }

    setManualBusy(true);
    setError('');
    try {
      await bookAppointment({
        branchId,
        serviceId: selectedService,
        barberId: selectedBarber,
        startsAt: selectedSlot.startsAt,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        notes: notes.trim(),
      });
      setShowManualModal(false);
      setSelectedService('');
      setSelectedBarber('');
      setSelectedSlot(null);
      setClientName('');
      setClientPhone('');
      setNotes('');
      setRevision(r => r + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el turno.');
    } finally {
      setManualBusy(false);
    }
  }

  async function handleCompleteService() {
    if (!completingAppt) return;
    setCompleteBusy(true);
    setError('');
    try {
      await completeAppointmentService({
        appointmentId: completingAppt.id,
        paymentMethod,
        paymentReference,
        saleNotes: `Turno atendido en recepción (${branchName})`,
      });
      setCompletingAppt(null);
      setRevision(r => r + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al registrar cobro y completar.');
    } finally {
      setCompleteBusy(false);
    }
  }

  async function handleCancel(id: string) {
    const reason = window.prompt('Motivo de cancelación:') || 'Cancelado en recepción';
    try {
      await cancelAppointment(id, reason);
      setRevision(r => r + 1);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'No se pudo cancelar el turno.');
    }
  }

  return (
    <div className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RECEPCIÓN • {branchName}</span>
          <h2>Agenda del día</h2>
          <p className="employee-help">
            Turnos agendados en esta sucursal. Asentá la atención directamente en Caja sin duplicar
            trabajos.
          </p>
        </div>
        <button type="button" className="action-primary" onClick={() => setShowManualModal(true)}>
          + Turno manual
        </button>
      </div>

      {error && (
        <div className="welcome-alert-error" role="alert" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {/* Filtros rápidos */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#15181e',
          padding: '1rem',
          borderRadius: '8px',
          margin: '1.25rem 0',
        }}
      >
        <label
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Fecha:
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              background: '#0e1013',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
            }}
          />
        </label>

        <label
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Estado:
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
            style={{
              padding: '0.4rem 0.6rem',
              background: '#0e1013',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
            }}
          >
            <option value="all">Todos ({total})</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
            <option value="no_show">Ausentes</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Cargando agenda de {branchName}…</p>
      ) : appointments.length === 0 ? (
        <p className="empty-copy">No hay turnos registrados para esta fecha en {branchName}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                border: '1px solid rgba(255,255,255,0.06)',
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
                  <strong style={{ color: '#c59b27', fontSize: '1.1rem' }}>
                    {new Date(appt.startsAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}{' '}
                    hs
                  </strong>
                  <strong style={{ color: '#fff', fontSize: '1rem' }}>{appt.clientName}</strong>
                  <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                  {appt.serviceName} con {appt.barberName} • {formatCurrency(appt.priceCents)}
                  {appt.clientPhone ? ` • 📞 ${appt.clientPhone}` : ''}
                  {appt.notes ? ` • Nota: "${appt.notes}"` : ''}
                </div>
              </div>

              {appt.status === 'confirmed' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="action-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                    onClick={() => setCompletingAppt(appt)}
                  >
                    Atender y Cobrar
                  </button>
                  <button
                    type="button"
                    className="action-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: '#f87171' }}
                    onClick={() => void handleCancel(appt.id)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL COBRAR / COMPLETAR */}
      {completingAppt && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal">
            <h2>Registrar atención y cobro en Caja</h2>
            <p>
              Cliente: <strong>{completingAppt.clientName}</strong>
              <br />
              Servicio: <strong>{completingAppt.serviceName}</strong> con{' '}
              <strong>{completingAppt.barberName}</strong>
              <br />
              Importe acordado:{' '}
              <strong style={{ color: '#c59b27' }}>
                {formatCurrency(completingAppt.priceCents)}
              </strong>
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Medio de pago en caja:
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    padding: '0.65rem',
                    background: '#0e1013',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                  }}
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia bancaria</option>
                </select>
              </label>

              {paymentMethod === 'transfer' && (
                <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                  Referencia o comprobante de transferencia:
                  <input
                    type="text"
                    value={paymentReference}
                    placeholder="ej: Op. #98124"
                    onChange={e => setPaymentReference(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      padding: '0.65rem',
                      background: '#0e1013',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                    }}
                  />
                </label>
              )}
            </div>

            <div className="huomo-modal-actions">
              <button
                type="button"
                className="action-secondary"
                disabled={completeBusy}
                onClick={() => setCompletingAppt(null)}
              >
                Volver
              </button>
              <button
                type="button"
                className="action-primary"
                disabled={completeBusy}
                onClick={() => void handleCompleteService()}
              >
                {completeBusy ? 'Registrando en Caja…' : 'Confirmar cobro y finalizar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESERVA MANUAL EN RECEPCION */}
      {showManualModal && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal" style={{ maxWidth: '540px' }}>
            <h2>Nuevo turno manual ({branchName})</h2>
            <form
              onSubmit={handleManualBooking}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                Servicio *
                <select
                  required
                  value={selectedService}
                  onChange={e => {
                    setSelectedService(e.target.value);
                    setSelectedBarber('');
                    setSelectedSlot(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#0e1013',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Elegí servicio</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.priceCents)})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                Barbero *
                <select
                  required
                  disabled={!selectedService}
                  value={selectedBarber}
                  onChange={e => {
                    setSelectedBarber(e.target.value);
                    setSelectedSlot(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#0e1013',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Elegí barbero</option>
                  {barbers.map(b => (
                    <option key={b.barberId} value={b.barberId}>
                      {b.barberName}
                    </option>
                  ))}
                </select>
              </label>

              {slots.length > 0 && (
                <div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: '#d1d5db',
                      display: 'block',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Horarios disponibles hoy:
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}
                  >
                    {slots.map(slot => (
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
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Nombre del cliente *
                  <input
                    type="text"
                    required
                    placeholder="ej: Santiago Díaz"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#0e1013',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                    }}
                  />
                </label>

                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Teléfono
                  <input
                    type="tel"
                    placeholder="11 4444-4444"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#0e1013',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                    }}
                  />
                </label>
              </div>

              <div className="huomo-modal-actions">
                <button
                  type="button"
                  className="action-secondary"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="action-primary"
                  disabled={manualBusy || !selectedSlot}
                >
                  {manualBusy ? 'Guardando…' : 'Crear turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
