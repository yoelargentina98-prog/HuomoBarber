import { useState } from 'react';
import { useBranches } from '../../branches/hooks/useBranches';
import { shiftDate, weekLabel, weekStart } from './model';
import { useTeamWeek } from './useTeamWeek';
import { WeekResults } from './WeekResults';
import './dashboard.css';

export function TeamDashboard() {
  const [start, setStart] = useState(weekStart);
  const [branchId, setBranchId] = useState('');
  const { branches, error: branchError, refresh: refreshBranches } = useBranches();
  const { rows, loading, error, refresh } = useTeamWeek(start, branchId);
  return (
    <section className="management-card team-week" aria-label="Desempeño semanal del equipo">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EL EQUIPO EN NÚMEROS</span>
          <h2>Destacados de la semana</h2>
          <p>{weekLabel(start)} · lunes a domingo</p>
        </div>
        <button type="button" className="action-secondary" disabled={loading} onClick={refresh}>
          Actualizar resumen
        </button>
      </div>
      <div className="team-week-filters">
        <button
          type="button"
          className="action-secondary"
          onClick={() => setStart(value => shiftDate(value, -7))}
          aria-label="Semana anterior"
        >
          ←
        </button>
        <label>
          Semana del
          <input
            type="date"
            value={start}
            onChange={event => {
              if (event.target.value) setStart(weekStart(event.target.value));
            }}
          />
        </label>
        <button
          type="button"
          className="action-secondary"
          onClick={() => setStart(value => shiftDate(value, 7))}
          aria-label="Semana siguiente"
        >
          →
        </button>
        <button type="button" className="text-button" onClick={() => setStart(weekStart())}>
          Esta semana
        </button>
        <label>
          Sucursal del servicio
          <select value={branchId} onChange={event => setBranchId(event.target.value)}>
            <option value="">Todas las sucursales</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
                {!branch.active ? ' (inactiva)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {branchError && (
        <div role="alert">
          <p>{branchError}</p>
          <button type="button" className="text-button" onClick={refreshBranches}>
            Reintentar sucursales
          </button>
        </div>
      )}
      <p className="employee-help">
        Importes y comisiones de servicios realizados, sin anulados. La comisión es generada, no
        pagada. Los turnos reservados se incorporarán cuando esté disponible la agenda.
      </p>
      {loading ? (
        <p role="status" className="empty-copy">
          Cargando desempeño semanal…
        </p>
      ) : error ? (
        <div role="alert" className="data-error">
          <p>{error}</p>
          <button type="button" className="action-secondary" onClick={refresh}>
            Reintentar resumen
          </button>
        </div>
      ) : (
        <WeekResults rows={rows} />
      )}
    </section>
  );
}
