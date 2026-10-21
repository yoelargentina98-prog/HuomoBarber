import { useState } from 'react';
import { SaveForm } from '../../shared/components/SaveForm';
import { field } from '../../shared/lib/form';
import { voidPayment } from './service';
export function VoidPayment({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="text-button" onClick={() => setOpen(true)}>
        Anular cobro
      </button>
    );
  return (
    <div className="void-entry">
      <p className="employee-help">Corrige el registro; no devuelve dinero al cliente.</p>
      <SaveForm
        label="Confirmar anulación"
        onSaved={onSaved}
        save={data => voidPayment(id, field(data, 'reason'))}
      >
        <label>
          Motivo de anulación
          <input name="reason" minLength={3} maxLength={300} required />
        </label>
      </SaveForm>
      <button className="text-button" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </div>
  );
}
