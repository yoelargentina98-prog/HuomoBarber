import { useEffect, useRef, useState } from 'react';
import { SaveForm } from '../../../shared/components/SaveForm';
import { money } from '../../employees/model/money';
import { completeAppointmentService } from '../services/appointments-service';
import type { Appointment } from '../model/types';
import '../../cash/cash.css';

export function AppointmentCharge({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [operation] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) {
      if (node.showModal) node.showModal();
      else node.setAttribute('open', '');
    }
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="sale-modal"
      aria-labelledby="appointment-charge-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
    >
      <section className="management-card">
        <div className="section-heading">
          <h2 id="appointment-charge-title">Atender y cobrar turno</h2>
          <button className="text-button" onClick={onClose}>
            Cerrar formulario
          </button>
        </div>
        <p>
          {appointment.clientName} · {appointment.serviceName} · {appointment.barberName}
        </p>
        <p>
          <strong>{money(appointment.priceCents)}</strong>
        </p>
        <SaveForm
          label="Confirmar atención y cobro"
          onSaved={onSaved}
          save={async data => {
            await completeAppointmentService({
              appointmentId: appointment.id,
              paymentMethod: String(data.get('method')) as 'cash' | 'transfer',
              paymentReference: String(data.get('reference') ?? '').trim(),
              saleNotes: String(data.get('notes') ?? '').trim(),
              operationId: operation,
            });
          }}
        >
          <label>
            Medio de pago
            <select name="method" required>
              <option value="">Seleccioná cómo pagó</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>
          <label>
            Referencia (opcional)
            <input name="reference" maxLength={150} />
          </label>
          <label className="form-wide">
            Notas (opcional)
            <input name="notes" maxLength={500} />
          </label>
        </SaveForm>
      </section>
    </dialog>
  );
}
