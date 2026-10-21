import { useState } from 'react';
import { voidEntry } from '../services/employee-write';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';

export function VoidEntry({
  id,
  type,
  onSaved,
}: {
  id: string;
  type: 'service' | 'adjustment';
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="text-button" onClick={() => setOpen(true)}>
        Anular
      </button>
    );
  return (
    <div className="void-entry">
      <SaveForm
        label="Confirmar anulación"
        onSaved={() => {
          setOpen(false);
          onSaved();
        }}
        save={data => voidEntry(type, id, field(data, 'reason'))}
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
