import { useId } from 'react';
import type { Interval } from './model';

export function IntervalEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Interval[];
  onChange: (value: Interval[]) => void;
}) {
  const id = useId();
  return (
    <div className="schedule-intervals">
      {!value.length && <p className="employee-help">Sin actividad</p>}
      {value.map((interval, index) => (
        <div className="schedule-interval" key={index}>
          <label htmlFor={`${id}-${index}-start`}>
            Desde
            <input
              id={`${id}-${index}-start`}
              aria-label={`${label}, desde ${index + 1}`}
              type="time"
              required
              value={interval.start}
              onChange={event =>
                onChange(
                  value.map((item, i) =>
                    i === index ? { ...item, start: event.target.value } : item
                  )
                )
              }
            />
          </label>
          <label htmlFor={`${id}-${index}-end`}>
            Hasta
            <input
              id={`${id}-${index}-end`}
              aria-label={`${label}, hasta ${index + 1}`}
              type="time"
              required
              value={interval.end}
              onChange={event =>
                onChange(
                  value.map((item, i) =>
                    i === index ? { ...item, end: event.target.value } : item
                  )
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            aria-label={`${label}, quitar franja ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="action-secondary"
        disabled={value.length >= 8}
        onClick={() => onChange([...value, { start: '', end: '' }])}
      >
        Agregar franja
      </button>
    </div>
  );
}
