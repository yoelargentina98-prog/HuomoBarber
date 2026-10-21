import { useEffect, useState } from 'react';
import {
  getBranchAppointments,
  getAvailableBranches,
  getAvailableServices,
  getAvailableBarbers,
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  completeAppointmentService,
  getBookingSettings,
  saveBookingSettings,
} from '../../appointments/services/appointments-service';
import type {
  Appointment,
  AppointmentStatus,
  BookingSettings,
  BookingSlot,
  PublicBarber,
} from '../../appointments/model/types';
import { formatCurrency } from '../../../shared/utils/currency';
import '../../staff/staff.css';

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'all'>('all');

  // Modales
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<BookingSettings>({
    minAdvanceHours: 2,
    maxFutureDays: 30,
    cancelLimitHours: 2,
    maxActivePerClient: 3,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual booking form state
  const [manualBranch, setManualBranch] = useState('');
  const [manualServices, setManualServices] = useState<
    Array<{ id: string; name: string; priceCents: number }>
  >([]);
  const [manualService, setManualService] = useState('');
  const [manualBarbers, setManualBarbers] = useState<PublicBarber[]>([]);
  const [manualBarber, setManualBarber] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualSlots, setManualSlots] = useState<BookingSlot[]>([]);
  const [manualSlot, setManualSlot] = useState<BookingSlot | null>(null);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Load branches and settings on mount
  useEffect(() => {
    async function init() {
      try {
        const [b, s] = await Promise.all([getAvailableBranches(), getBookingSettings()]);
        setBranches(b);
        setSettings(s);
      } catch {
        /* fallback */
      }
    }
    void init();
  }, []);

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchAppointments() {
      try {
        const res = await getBranchAppointments({
          branchId: selectedBranch || undefined,
          dateStr: selectedDate || undefined,
          status: selectedStatus,
          page,
        });
        if (active) {
          setAppointments(res.items);
          setTotal(res.total);
          setError('');
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Error al consultar turnos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchAppointments();
    return () => {
      active = false;
    };
  }, [selectedBranch, selectedDate, selectedStatus, page, revision]);

  // Cargar servicios cuando cambia manualBranch
  useEffect(() => {
    if (!manualBranch) return;
    void getAvailableServices(manualBranch).then(setManualServices);
  }, [manualBranch]);

  // Cargar barberos cuando cambia manualService
  useEffect(() => {
    if (!manualBranch || !manualService) return;
    void getAvailableBarbers(manualBranch, manualService).then(setManualBarbers);
  }, [manualBranch, manualService]);

  // Cargar slots cuando cambia manualBarber o manualDate
  useEffect(() => {
    if (!manualBranch || !manualService || !manualBarber || !manualDate) return;
    void getAvailableSlots(manualBranch, manualService, manualBarber, manualDate).then(
      setManualSlots
    );
  }, [manualBranch, manualService, manualBarber, manualDate]);

  async function handleCreateManualBooking(e: React.FormEvent) {
    e.preventDefault();
    if (
      !manualBranch ||
      !manualService ||
      !manualBarber ||
      !manualSlot ||
      !manualClientName.trim()
    ) {
      setError('Completá los campos obligatorios para la reserva manual.');
      return;
    }

    setManualSubmitting(true);
    setError('');
    try {
      await bookAppointment({
        branchId: manualBranch,
        serviceId: manualService,
        barberId: manualBarber,
        startsAt: manualSlot.startsAt,
        clientName: manualClientName.trim(),
        clientPhone: manualClientPhone.trim(),
        clientEmail: manualClientEmail.trim(),
        notes: manualNotes.trim(),
      });
      setShowManualModal(false);
      resetManualForm();
      setRevision(r => r + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la reserva manual.');
    } finally {
      setManualSubmitting(false);
    }
  }

  function resetManualForm() {
    setManualBranch('');
    setManualService('');
    setManualBarber('');
    setManualSlot(null);
    setManualClientName('');
    setManualClientPhone('');
    setManualClientEmail('');
    setManualNotes('');
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await saveBookingSettings(settings);
      setSettings(updated);
      setShowSettingsModal(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar configuración.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCancel(id: string) {
    const reason =
      window.prompt('Motivo de la cancelación del turno:') || 'Cancelado por administración';
    try {
      await cancelAppointment(id, reason);
      setRevision(r => r + 1);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'No se pudo cancelar el turno.');
    }
  }

  async function handleComplete(id: string) {
    const confirm = window.confirm('¿Marcar este turno como completado e ingresarlo en Caja?');
    if (!confirm) return;
    try {
      await completeAppointmentService({
        appointmentId: id,
        paymentMethod: 'cash',
        saleNotes: 'Atención completada',
      });
      setRevision(r => r + 1);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'No se pudo completar el turno.');
    }
  }

  return (
    <div className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AGENDA INTEGRAL</span>
          <h1>Turnos y Reservas</h1>
          <p className="employee-help">
            Gestión global de turnos de clientes, reservas manuales y reglas de disponibilidad.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="action-secondary"
            onClick={() => setShowSettingsModal(true)}
          >
            Reglas de reserva
          </button>
          <button type="button" className="action-primary" onClick={() => setShowManualModal(true)}>
            + Nueva reserva manual
          </button>
        </div>
      </div>

      {error && (
        <div className="welcome-alert-error" role="alert" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {/* Filtros */}
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
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          Sucursal
          <select
            value={selectedBranch}
            onChange={e => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem',
              background: '#0e1013',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
            }}
          >
            <option value="">Todas las sucursales</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          Fecha
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem',
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
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          Estado
          <select
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value as AppointmentStatus | 'all');
              setPage(1);
            }}
            style={{
              padding: '0.5rem',
              background: '#0e1013',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
            <option value="no_show">Ausentes</option>
          </select>
        </label>

        {(selectedBranch || selectedDate || selectedStatus !== 'all') && (
          <button
            type="button"
            className="action-secondary"
            style={{ alignSelf: 'flex-end', height: '36px' }}
            onClick={() => {
              setSelectedBranch('');
              setSelectedDate('');
              setSelectedStatus('all');
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla de turnos */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Cargando agenda…</p>
      ) : appointments.length === 0 ? (
        <p className="empty-copy">No se encontraron turnos con los filtros seleccionados.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="staff-table" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Horario</th>
                <th>Cliente</th>
                <th>Sucursal</th>
                <th>Barbero</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appt => (
                <tr key={appt.id}>
                  <td>
                    <strong>
                      {new Date(appt.startsAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'America/Argentina/Buenos_Aires',
                      })}
                    </strong>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                      {new Date(appt.startsAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Argentina/Buenos_Aires',
                      })}{' '}
                      hs
                    </div>
                  </td>
                  <td>
                    <strong>{appt.clientName}</strong>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      {appt.clientPhone || appt.clientEmail || 'Sin contacto'}
                      {appt.clientId ? ' • Con cuenta' : ' • Manual'}
                    </div>
                  </td>
                  <td>{appt.branchName}</td>
                  <td>{appt.barberName}</td>
                  <td>{appt.serviceName}</td>
                  <td style={{ color: '#c59b27', fontWeight: 600 }}>
                    {formatCurrency(appt.priceCents)}
                  </td>
                  <td>
                    <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                  </td>
                  <td>
                    {appt.status === 'confirmed' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="action-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => void handleComplete(appt.id)}
                        >
                          Completar
                        </button>
                        <button
                          type="button"
                          className="action-secondary"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            color: '#f87171',
                          }}
                          onClick={() => void handleCancel(appt.id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {total > 20 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            Página {page} de {Math.ceil(total / 20)} (Total: {total} turnos)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="action-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="action-secondary"
              disabled={page * 20 >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* MODAL RESERVA MANUAL */}
      {showManualModal && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal" style={{ maxWidth: '600px' }}>
            <h2>Nueva reserva manual</h2>
            <p>
              Creá un turno para atención telefónica o presencial. No requiere cuenta de usuario.
            </p>
            <form
              onSubmit={handleCreateManualBooking}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Sucursal *
                  <select
                    required
                    value={manualBranch}
                    onChange={e => {
                      setManualBranch(e.target.value);
                      setManualService('');
                      setManualBarber('');
                      setManualSlot(null);
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
                    <option value="">Elegí sucursal</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Servicio *
                  <select
                    required
                    disabled={!manualBranch}
                    value={manualService}
                    onChange={e => {
                      setManualService(e.target.value);
                      setManualBarber('');
                      setManualSlot(null);
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
                    {manualServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.priceCents)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Barbero *
                  <select
                    required
                    disabled={!manualService}
                    value={manualBarber}
                    onChange={e => {
                      setManualBarber(e.target.value);
                      setManualSlot(null);
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
                    {manualBarbers.map(b => (
                      <option key={b.barberId} value={b.barberId}>
                        {b.barberName}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Fecha *
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={e => {
                      setManualDate(e.target.value);
                      setManualSlot(null);
                    }}
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

              {manualSlots.length > 0 && (
                <div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: '#d1d5db',
                      display: 'block',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Horarios disponibles *
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
                    {manualSlots.map(slot => (
                      <button
                        type="button"
                        key={slot.startsAt}
                        className={`slot-button ${manualSlot?.startsAt === slot.startsAt ? 'selected' : ''}`}
                        onClick={() => setManualSlot(slot)}
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
                    placeholder="ej: Lucas Rossi"
                    value={manualClientName}
                    onChange={e => setManualClientName(e.target.value)}
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
                    placeholder="11 5555-5555"
                    value={manualClientPhone}
                    onChange={e => setManualClientPhone(e.target.value)}
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
                  disabled={manualSubmitting || !manualSlot}
                >
                  {manualSubmitting ? 'Guardando…' : 'Crear reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DE REGLAS */}
      {showSettingsModal && (
        <div className="huomo-modal-backdrop">
          <div className="huomo-modal">
            <h2>Reglas de Reserva</h2>
            <p>Configurá los límites de tiempo y restricciones para los clientes.</p>
            <form
              onSubmit={handleSaveSettings}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Anticipación mínima para reservar (horas):
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.minAdvanceHours}
                  onChange={e =>
                    setSettings({ ...settings, minAdvanceHours: Number(e.target.value) })
                  }
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

              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Ventana de reserva hacia adelante (días):
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={settings.maxFutureDays}
                  onChange={e =>
                    setSettings({ ...settings, maxFutureDays: Number(e.target.value) })
                  }
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

              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Límite previo para cancelar o reprogramar (horas):
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.cancelLimitHours}
                  onChange={e =>
                    setSettings({ ...settings, cancelLimitHours: Number(e.target.value) })
                  }
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

              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Máximo de turnos futuros activos por cliente:
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.maxActivePerClient}
                  onChange={e =>
                    setSettings({ ...settings, maxActivePerClient: Number(e.target.value) })
                  }
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

              <div className="huomo-modal-actions">
                <button
                  type="button"
                  className="action-secondary"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cerrar
                </button>
                <button type="submit" className="action-primary" disabled={savingSettings}>
                  {savingSettings ? 'Guardando…' : 'Guardar reglas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
