import { useRef, useState } from 'react';
import { SaveForm } from '../../shared/components/SaveForm';
import { field } from '../../shared/lib/form';
import { money } from '../employees/model/money';
import { serviceDate } from '../employees/model/period';
import { localNow, type PendingService } from './model';
import { collectPayment } from './service';

export function CollectForm({
  service,
  onSaved,
  onCancel,
}: {
  service: PendingService;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Same payload reuses its key; changed data gets a new key. Server uniqueness
  // on the service prevents double collection even after an uncertain response.
  const operation = useRef<{ id: string; payload: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="employee-editor">
      <h3>Cobrar {service.service_name}</h3>
      <p>
        {service.barber_name} · {service.branch_name} ·{' '}
        <strong>{money(service.amount_cents)}</strong>
      </p>
      <p className="employee-help">
        Servicio realizado: {serviceDate(service.performed_at)}. Se cobra el importe completo. El
        día de Caja se determina por la fecha del cobro.
      </p>
      <SaveForm
        label="Registrar cobro"
        onSaved={onSaved}
        save={async data => {
          const input = {
            serviceId: service.id,
            method: field(data, 'method'),
            paidAt: field(data, 'paid_at'),
            reference: field(data, 'reference'),
            notes: field(data, 'notes'),
          };
          const payload = JSON.stringify(input);
          if (!operation.current || operation.current.payload !== payload)
            operation.current = { id: crypto.randomUUID(), payload };
          setSubmitted(true);
          await collectPayment({ ...input, requestId: operation.current.id });
        }}
      >
        <label>
          Medio de pago
          <select name="method" required defaultValue="">
            <option value="">Elegí el medio de pago</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
        </label>
        <label>
          Fecha y hora del cobro (Argentina)
          <input name="paid_at" type="datetime-local" step="1" required defaultValue={localNow()} />
        </label>
        <label>
          Referencia o comprobante (opcional)
          <input name="reference" maxLength={200} placeholder="Identificador de la transferencia" />
        </label>
        <label>
          Notas (opcional)
          <input name="notes" maxLength={1000} />
        </label>
      </SaveForm>
      {submitted && (
        <p className="employee-help">
          Si falló la conexión, podés reintentar con los mismos datos. Si el cobro ya existe,
          actualizá Caja para revisarlo; el servicio no admite dos cobros vigentes.
        </p>
      )}
      <button className="text-button" type="button" onClick={onCancel}>
        Cerrar cobro
      </button>
    </div>
  );
}
