import { Paginated } from '../../shared/components/Paginated';
import { IntervalEditor } from './IntervalEditor';
import type { Exception } from './model';

export function ExceptionsEditor({
  value,
  onChange,
}: {
  value: Exception[];
  onChange: (value: Exception[]) => void;
}) {
  function update(index: number, patch: Partial<Exception>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <section className="schedule-exceptions">
      <h3>Excepciones por fecha</h3>
      <p className="employee-help">
        La excepción reemplaza el horario completo de ese día. Para vacaciones o ausencias, dejá la
        fecha sin franjas. Para varios días, agregá cada fecha.
      </p>
      <Paginated items={value.map((exception, index) => ({ exception, index, id: index }))}>
        {pageRows => (
          <>
            {pageRows.map(({ exception, index }) => (
              <fieldset className="schedule-day" key={index}>
                <legend>Excepción {index + 1}</legend>
                <div className="form-grid">
                  <label>
                    Fecha
                    <input
                      aria-label={`Fecha de excepción ${index + 1}`}
                      type="date"
                      required
                      value={exception.date}
                      onChange={event => update(index, { date: event.target.value })}
                    />
                  </label>
                  <label>
                    Motivo
                    <input
                      maxLength={300}
                      value={exception.reason}
                      onChange={event => update(index, { reason: event.target.value })}
                      placeholder="Ausencia, vacaciones, horario especial…"
                    />
                  </label>
                </div>
                <IntervalEditor
                  label={`Excepción ${index + 1}`}
                  value={exception.intervals}
                  onChange={intervals => update(index, { intervals })}
                />
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  Eliminar excepción {index + 1}
                </button>
              </fieldset>
            ))}
          </>
        )}
      </Paginated>
      <button
        type="button"
        className="action-secondary"
        disabled={value.length >= 366}
        onClick={() => onChange([...value, { date: '', reason: '', intervals: [] }])}
      >
        Agregar excepción
      </button>
    </section>
  );
}
