import { loadBranchSchedule, saveBranchSchedule } from './branch-service';
import { useEffect, useState } from 'react';
import { SaveForm } from '../../shared/components/SaveForm';
import { IntervalEditor } from './IntervalEditor';
import { ExceptionsEditor } from './ExceptionsEditor';
import { weekdays, type Schedule } from './model';
import { loadSchedule, saveSchedule } from './service';
import './schedule.css';

export function SchedulePanel({
  employeeId = '',
  branchId,
  onSaved,
}: {
  employeeId?: string;
  branchId?: string;
  onSaved: () => void;
}) {
  const target = branchId ?? employeeId;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    employeeId: string;
    attempt: number;
    data?: Schedule;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    (branchId ? loadBranchSchedule(target) : loadSchedule(target))
      .then(data => {
        if (active) setLoaded({ employeeId: target, attempt, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setLoaded({
            employeeId: target,
            attempt,
            error: cause instanceof Error ? cause.message : 'No se pudieron cargar los horarios.',
          });
      });
    return () => {
      active = false;
    };
  }, [employeeId, branchId, target, attempt]);
  const current = loaded?.employeeId === target && loaded.attempt === attempt ? loaded : undefined;
  return (
    <section className="management-card schedule-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DISPONIBILIDAD</span>
          <h2>{branchId ? 'Horarios de apertura de la sucursal' : 'Horarios de actividad'}</h2>
        </div>
      </div>
      <p className="employee-help">
        Horario de Argentina. Separá las franjas para indicar descansos o turnos partidos. Un día
        sin franjas es un día libre. Esta configuración es independiente del período de
        remuneración.
      </p>
      <p className="employee-help">
        La agenda cruza la apertura de la sucursal con la disponibilidad del barbero. Sin horarios
        configurados no se ofrecen reservas. Los cambios no cancelan turnos existentes.
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
          key={`${target}-${current.data.revision}`}
          employeeId={target}
          branchId={branchId}
          initial={current.data}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}

function ScheduleForm({
  employeeId,
  branchId,
  initial,
  onSaved,
}: {
  employeeId: string;
  branchId?: string;
  initial: Schedule;
  onSaved: () => void;
}) {
  const [schedule, setSchedule] = useState(initial);
  return (
    <SaveForm
      label="Guardar horarios"
      save={async () => {
        if (branchId) await saveBranchSchedule(branchId, schedule);
        else await saveSchedule(employeeId, schedule);
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
