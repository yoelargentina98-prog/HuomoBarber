import { useEffect, useState } from 'react';
import { SaveForm } from '../../shared/components/SaveForm';
import { IntervalEditor } from './IntervalEditor';
import { ExceptionsEditor } from './ExceptionsEditor';
import { weekdays, type Schedule } from './model';
import { loadSchedule, saveSchedule } from './service';
import './schedule.css';

export function SchedulePanel({
  employeeId,
  onSaved,
}: {
  employeeId: string;
  onSaved: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    employeeId: string;
    attempt: number;
    data?: Schedule;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    loadSchedule(employeeId)
      .then(data => {
        if (active) setLoaded({ employeeId, attempt, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setLoaded({
            employeeId,
            attempt,
            error: cause instanceof Error ? cause.message : 'No se pudieron cargar los horarios.',
          });
      });
    return () => {
      active = false;
    };
  }, [employeeId, attempt]);
  const current =
    loaded?.employeeId === employeeId && loaded.attempt === attempt ? loaded : undefined;
  return (
    <section className="management-card schedule-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DISPONIBILIDAD</span>
          <h2>Horarios de actividad</h2>
        </div>
      </div>
      <p className="employee-help">
        Horario de Argentina. Separá las franjas para indicar descansos o turnos partidos. Un día
        sin franjas es un día libre. Esta configuración es independiente del período de
        remuneración.
      </p>
      <p className="employee-help">
        Los horarios de apertura de la sucursal y la agenda todavía no están implementados. Por
        ahora se guarda la disponibilidad del barbero.
      </p>
      {!current && <p role="status">Cargando horarios…</p>}
      {current?.error && (
        <div role="alert">
          <p>{current.error}</p>
          <button className="action-secondary" onClick={() => setAttempt(value => value + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {current?.data && (
        <ScheduleForm
          key={`${employeeId}-${current.data.revision}`}
          employeeId={employeeId}
          initial={current.data}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}

function ScheduleForm({
  employeeId,
  initial,
  onSaved,
}: {
  employeeId: string;
  initial: Schedule;
  onSaved: () => void;
}) {
  const [schedule, setSchedule] = useState(initial);
  return (
    <SaveForm
      label="Guardar horarios"
      save={async () => {
        await saveSchedule(employeeId, schedule);
        setSchedule(value => ({ ...value, revision: value.revision + 1 }));
      }}
      onSaved={onSaved}
    >
      <h3>Semana habitual</h3>
      {schedule.revision === 0 && (
        <p className="employee-help">
          Todavía no hay horarios configurados. Seleccioná las franjas de los días que trabaja.
        </p>
      )}
      {[1, 2, 3, 4, 5, 6, 0].map(day => (
        <fieldset className="schedule-day" key={day}>
          <legend>{weekdays[day]}</legend>
          <IntervalEditor
            label={weekdays[day] ?? 'Día'}
            value={schedule.weekly.find(item => item.day === day)?.intervals ?? []}
            onChange={intervals =>
              setSchedule(value => ({
                ...value,
                weekly: value.weekly.map(item => (item.day === day ? { day, intervals } : item)),
              }))
            }
          />
        </fieldset>
      ))}
      <ExceptionsEditor
        value={schedule.exceptions}
        onChange={exceptions => setSchedule(value => ({ ...value, exceptions }))}
      />
    </SaveForm>
  );
}
