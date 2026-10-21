import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableBranches,
  getAvailableServices,
  getAvailableBarbers,
  getAvailableSlots,
  bookAppointment,
  getBookingSettings,
} from '../../appointments/services/appointments-service';
import { getCurrentUserProfile } from '../../staff/services/admin-session';
import type { BookingSettings, BookingSlot, PublicBarber } from '../../appointments/model/types';
import { formatCurrency } from '../../../shared/utils/currency';

interface BranchOption {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  durationMinutes: number;
}

type WizardStep = 'branch' | 'service' | 'barber' | 'datetime' | 'summary' | 'confirmed';

export function ClientBookingWizard() {
  const navigate = useNavigate();

  // Wizard Navigation
  const [step, setStep] = useState<WizardStep>('branch');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Rules & Profile
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Selections
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);

  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<PublicBarber | null>(null);

  // Date and Time Slots
  const todayStr = getTodayArgentinaString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  // Notes
  const [notes, setNotes] = useState('');

  // 1. Cargar configuración y datos del cliente
  useEffect(() => {
    async function init() {
      try {
        const [rules, profile] = await Promise.all([getBookingSettings(), getCurrentUserProfile()]);
        setSettings(rules);
        if (profile) {
          setClientName(profile.fullName);
          setClientPhone(profile.phone);
          setClientEmail(profile.email);
        }
      } catch {
        /* valores por defecto */
      }
    }
    void init();
  }, []);

  // 2. Cargar sucursales al inicio
  useEffect(() => {
    async function fetchBranches() {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableBranches();
        setBranches(data);
        if (data.length === 1 && data[0]) {
          setSelectedBranch(data[0]);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Error al cargar sucursales.');
      } finally {
        setLoading(false);
      }
    }
    void fetchBranches();
  }, []);

  // 3. Cuando cambia la sucursal, cargar servicios
  useEffect(() => {
    if (!selectedBranch) return;
    async function fetchServices() {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableServices(selectedBranch!.id);
        setServices(data);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Error al cargar servicios.');
      } finally {
        setLoading(false);
      }
    }
    void fetchServices();
  }, [selectedBranch]);

  // 4. Cuando cambia el servicio, cargar barberos habilitados
  useEffect(() => {
    if (!selectedBranch || !selectedService) return;
    async function fetchBarbers() {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableBarbers(selectedBranch!.id, selectedService!.id);
        setBarbers(data);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Error al cargar barberos.');
      } finally {
        setLoading(false);
      }
    }
    void fetchBarbers();
  }, [selectedBranch, selectedService]);

  // 5. Cuando cambia el barbero o la fecha, calcular disponibilidad en servidor
  useEffect(() => {
    if (!selectedBranch || !selectedService || !selectedBarber || !selectedDate) return;
    async function fetchSlots() {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableSlots(
          selectedBranch!.id,
          selectedService!.id,
          selectedBarber!.barberId,
          selectedDate
        );
        setSlots(data);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Error al consultar disponibilidad.');
      } finally {
        setLoading(false);
      }
    }
    void fetchSlots();
  }, [selectedBranch, selectedService, selectedBarber, selectedDate]);

  // Confirmación final
  async function handleConfirmBooking() {
    if (!selectedBranch || !selectedService || !selectedBarber || !selectedSlot) {
      setError('Faltan completar pasos de la reserva.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await bookAppointment({
        branchId: selectedBranch.id,
        serviceId: selectedService.id,
        barberId: selectedBarber.barberId,
        startsAt: selectedSlot.startsAt,
        clientName: clientName.trim() || 'Cliente',
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        notes: notes.trim(),
      });
      setStep('confirmed');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo confirmar la reserva. El horario podría haberse ocupado recién.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Límites de fecha para el calendario
  const maxDateStr = getMaxArgentinaDate(settings?.maxFutureDays ?? 30);

  return (
    <div className="wizard-container">
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Reservar turno
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
          Seleccioná los detalles de tu turno en 5 pasos sencillos.
        </p>
      </div>

      {/* Navegador de pasos */}
      {step !== 'confirmed' && (
        <div className="wizard-steps-nav" role="navigation" aria-label="Pasos de la reserva">
          <div
            className={`wizard-step-item ${step === 'branch' ? 'active' : selectedBranch ? 'completed' : ''}`}
          >
            <span className="wizard-step-num">1</span>
            <span>Sucursal</span>
          </div>
          <div
            className={`wizard-step-item ${step === 'service' ? 'active' : selectedService ? 'completed' : ''}`}
          >
            <span className="wizard-step-num">2</span>
            <span>Servicio</span>
          </div>
          <div
            className={`wizard-step-item ${step === 'barber' ? 'active' : selectedBarber ? 'completed' : ''}`}
          >
            <span className="wizard-step-num">3</span>
            <span>Barbero</span>
          </div>
          <div
            className={`wizard-step-item ${step === 'datetime' ? 'active' : selectedSlot ? 'completed' : ''}`}
          >
            <span className="wizard-step-num">4</span>
            <span>Fecha y Horario</span>
          </div>
          <div className={`wizard-step-item ${step === 'summary' ? 'active' : ''}`}>
            <span className="wizard-step-num">5</span>
            <span>Confirmación</span>
          </div>
        </div>
      )}

      {error && (
        <div className="welcome-alert-error" role="alert">
          {error}
        </div>
      )}
      {loading && (
        <p style={{ color: '#9ca3af', fontSize: '0.92rem' }}>Consultando opciones disponibles…</p>
      )}

      {/* PASO 1: SUCURSAL */}
      {step === 'branch' && (
        <section>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
            1. Elegí la sucursal
          </h2>
          <div className="selection-grid">
            {branches.map(branch => (
              <button
                type="button"
                key={branch.id}
                className={`select-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedBranch(branch);
                  setSelectedService(null);
                  setSelectedBarber(null);
                  setSelectedSlot(null);
                  setStep('service');
                }}
              >
                <h3>{branch.name}</h3>
                <p>{branch.address || 'Dirección central'}</p>
                {branch.phone && (
                  <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Tel: {branch.phone}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASO 2: SERVICIO */}
      {step === 'service' && selectedBranch && (
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>
              2. Elegí el servicio en {selectedBranch.name}
            </h2>
            <button
              type="button"
              className="welcome-secondary-btn"
              onClick={() => setStep('branch')}
            >
              ← Cambiar sucursal
            </button>
          </div>

          <div className="selection-grid">
            {services.map(svc => (
              <button
                type="button"
                key={svc.id}
                className={`select-card ${selectedService?.id === svc.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedService(svc);
                  setSelectedBarber(null);
                  setSelectedSlot(null);
                  setStep('barber');
                }}
              >
                <h3>{svc.name}</h3>
                <p>{svc.description || 'Cuidado profesional para tu estilo.'}</p>
                <div className="select-card-footer">
                  <span className="select-price">{formatCurrency(svc.priceCents)}</span>
                  <span className="select-duration">{svc.durationMinutes} min</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASO 3: BARBERO */}
      {step === 'barber' && selectedService && selectedBranch && (
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>
              3. Elegí al barbero para {selectedService.name}
            </h2>
            <button
              type="button"
              className="welcome-secondary-btn"
              onClick={() => setStep('service')}
            >
              ← Cambiar servicio
            </button>
          </div>

          {barbers.length === 0 && !loading && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#15181e',
                borderRadius: '8px',
              }}
            >
              <p style={{ color: '#9ca3af' }}>
                No encontramos barberos habilitados para este servicio en {selectedBranch.name}.
              </p>
              <button
                type="button"
                className="welcome-secondary-btn"
                onClick={() => setStep('service')}
                style={{ marginTop: '0.75rem' }}
              >
                Elegir otro servicio
              </button>
            </div>
          )}

          <div className="selection-grid">
            {barbers.map(barber => (
              <button
                type="button"
                key={barber.barberId}
                className={`select-card ${selectedBarber?.barberId === barber.barberId ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedBarber(barber);
                  setSelectedSlot(null);
                  setStep('datetime');
                }}
              >
                <h3>{barber.barberName}</h3>
                <p>Especialista en {selectedService.name}</p>
                <div className="select-card-footer">
                  <span style={{ fontSize: '0.85rem', color: '#c59b27' }}>Disponible</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASO 4: FECHA Y HORARIO */}
      {step === 'datetime' && selectedBarber && selectedService && selectedBranch && (
        <section className="slots-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>4. Seleccioná fecha y horario</h2>
            <button
              type="button"
              className="welcome-secondary-btn"
              onClick={() => setStep('barber')}
            >
              ← Cambiar barbero
            </button>
          </div>

          <div className="slots-date-picker">
            <label
              style={{
                fontSize: '0.9rem',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              Día de atención:
              <input
                type="date"
                value={selectedDate}
                min={todayStr}
                max={maxDateStr}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
              />
            </label>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', color: '#d1d5db', marginBottom: '0.75rem' }}>
              Horarios disponibles con {selectedBarber.barberName}:
            </h3>

            {slots.length === 0 && !loading && (
              <div
                style={{
                  padding: '1.5rem',
                  background: '#15181e',
                  borderRadius: '8px',
                  color: '#9ca3af',
                }}
              >
                No hay turnos libres para esta fecha. Los horarios pueden estar completos o no ser
                laborables para el barbero. Elegí otra fecha o consultá con otro barbero.
              </div>
            )}

            <div className="slots-grid">
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

          <div className="wizard-nav-actions">
            <button
              type="button"
              className="welcome-secondary-btn"
              onClick={() => setStep('barber')}
            >
              ← Paso anterior
            </button>
            <button
              type="button"
              className="client-cta-button"
              disabled={!selectedSlot}
              onClick={() => setStep('summary')}
            >
              Continuar al resumen →
            </button>
          </div>
        </section>
      )}

      {/* PASO 5: RESUMEN Y CONFIRMACIÓN */}
      {step === 'summary' &&
        selectedBranch &&
        selectedService &&
        selectedBarber &&
        selectedSlot && (
          <section className="wizard-summary">
            <h2
              style={{
                fontSize: '1.4rem',
                color: '#fff',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '0.75rem',
              }}
            >
              5. Confirmación de tu turno
            </h2>

            <div className="wizard-summary-rows">
              <div className="wizard-summary-row">
                <span>Sucursal</span>
                <span>
                  {selectedBranch.name} ({selectedBranch.address})
                </span>
              </div>
              <div className="wizard-summary-row">
                <span>Servicio</span>
                <span>
                  {selectedService.name} ({selectedService.durationMinutes} minutos)
                </span>
              </div>
              <div className="wizard-summary-row">
                <span>Barbero profesional</span>
                <span>{selectedBarber.barberName}</span>
              </div>
              <div className="wizard-summary-row">
                <span>Fecha y Horario</span>
                <span>
                  {formatDateArgentina(selectedSlot.startsAt)} a las {selectedSlot.timeDisplay} hs
                </span>
              </div>
              <div className="wizard-summary-row total">
                <span>Importe a abonar en el local</span>
                <span>{formatCurrency(selectedService.priceCents)}</span>
              </div>
            </div>

            <div className="wizard-rules-notice">
              <strong>Reglas de la reserva:</strong>
              <br />• Podés cancelar o reprogramar sin costo con hasta{' '}
              {settings?.cancelLimitHours ?? 2} horas de anticipación.
              <br />• Límite de {settings?.maxActivePerClient ?? 3} reservas activas simultáneas por
              cuenta.
              <br />• El pago se efectúa en el local por efectivo o transferencia bancaria.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.88rem', color: '#d1d5db' }}>
                Notas o aclaraciones para el barbero (opcional):
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={300}
                  placeholder="Preferencias de corte, barba o cualquier observación…"
                  style={{
                    width: '100%',
                    marginTop: '0.4rem',
                    padding: '0.75rem',
                    background: '#0e1013',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    minHeight: '80px',
                  }}
                />
              </label>
            </div>

            <div className="wizard-nav-actions">
              <button
                type="button"
                className="welcome-secondary-btn"
                onClick={() => setStep('datetime')}
                disabled={submitting}
              >
                ← Modificar horario
              </button>
              <button
                type="button"
                className="client-cta-button"
                disabled={submitting}
                onClick={() => void handleConfirmBooking()}
              >
                {submitting
                  ? 'Confirmando reserva en el servidor…'
                  : 'Confirmar reserva definitiva'}
              </button>
            </div>
          </section>
        )}

      {/* ESTADO CONFIRMADO */}
      {step === 'confirmed' && (
        <section
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            background: '#15181e',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              fontSize: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: '1.85rem', color: '#fff', marginBottom: '0.5rem' }}>
            ¡Tu turno está confirmado!
          </h2>
          <p
            style={{
              color: '#9ca3af',
              maxWidth: '480px',
              margin: '0 auto 2rem',
              fontSize: '1rem',
              lineHeight: 1.5,
            }}
          >
            Te esperamos en la sucursal <strong>{selectedBranch?.name}</strong> con{' '}
            <strong>{selectedBarber?.barberName}</strong> el{' '}
            <strong>{selectedSlot && formatDateArgentina(selectedSlot.startsAt)}</strong> a las{' '}
            <strong>{selectedSlot?.timeDisplay} hs</strong>.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="client-cta-button"
              onClick={() => navigate('/cliente/turnos')}
            >
              Ver mis turnos
            </button>
            <button
              type="button"
              className="welcome-secondary-btn"
              onClick={() => navigate('/cliente')}
            >
              Volver al inicio
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function getTodayArgentinaString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function getMaxArgentinaDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function formatDateArgentina(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
