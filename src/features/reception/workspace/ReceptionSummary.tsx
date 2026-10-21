import { useCashDay } from '../../cash/useCashDay';
import { cashSummary } from '../../cash/model';
import { today } from '../../employees/model/period';
import { money } from '../../employees/model/money';
import { AdminIcon } from '../../admin/components/AdminIcon';
import type { ReceptionEmployee } from './service';
export function ReceptionSummary({
  branch,
  team,
  activeBarbers,
  teamLoading,
  teamError,
  onCash,
  onTeam,
}: {
  branch: string;
  team: ReceptionEmployee[];
  activeBarbers?: number;
  teamLoading: boolean;
  teamError: string;
  onCash: (newSale: boolean) => void;
  onTeam: () => void;
}) {
  const { data, error, loading, refresh } = useCashDay(today(), branch);
  const summary = data ? (data.summary ?? cashSummary(data.payments)) : undefined;
  const active = team.filter(person => person.active);
  return (
    <div className="dashboard-stack">
      <div className="reception-metrics">
        <article>
          <span>Barberos activos</span>
          <strong>
            {teamLoading || teamError
              ? '—'
              : (activeBarbers ?? active.filter(person => person.role === 'barber').length)}
          </strong>
          <small>Cuentas habilitadas en la sucursal</small>
        </article>
        <article>
          <span>Total cobrado hoy</span>
          <strong>{summary ? money(summary.total) : '—'}</strong>
          <small>
            {summary
              ? `${summary.cashCount + summary.transferCount} cobros vigentes`
              : 'Consultando Caja'}
          </small>
        </article>
        <article>
          <span>Efectivo</span>
          <strong>{summary ? money(summary.cash) : '—'}</strong>
          <small>Ingresos registrados de hoy</small>
        </article>
        <article>
          <span>Transferencias</span>
          <strong>{summary ? money(summary.transfer) : '—'}</strong>
          <small>Ingresos registrados de hoy</small>
        </article>
      </div>
      {loading && <p role="status">Actualizando el resumen de hoy…</p>}
      {error && (
        <div className="data-error" role="alert">
          <p>{error}</p>
          <button className="action-secondary" onClick={refresh}>
            Reintentar resumen
          </button>
        </div>
      )}
      {teamError && (
        <p role="alert" className="inline-error">
          {teamError}
        </p>
      )}
      <div className="reception-columns">
        <section className="management-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EL MOSTRADOR</span>
              <h2>Todo listo para atender</h2>
            </div>
            <AdminIcon name="scissors" size={24} />
          </div>
          <p className="employee-help">
            Registrá el servicio, el barbero y el pago en una sola operación.
          </p>
          <button className="action-primary" onClick={() => onCash(true)}>
            <AdminIcon name="plus" size={16} /> Nueva venta
          </button>
          <div className="reception-pending">
            <div>
              <span>Trabajos de hoy pendientes de cobro</span>
              <strong>{data ? (data.summary?.pendingCount ?? data.pending.length) : '—'}</strong>
            </div>
            <button className="text-button" onClick={() => onCash(false)}>
              Abrir Caja →
            </button>
          </div>
        </section>
        <section className="management-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LAS PERSONAS</span>
              <h2>Tu equipo</h2>
            </div>
            <button className="text-button" onClick={onTeam}>
              Ver equipo →
            </button>
          </div>
          {teamLoading ? (
            <p role="status">Cargando equipo…</p>
          ) : teamError ? (
            <p>No se pudo actualizar el equipo.</p>
          ) : !active.length ? (
            <p className="empty-copy">Todavía no hay cuentas activas en esta sucursal.</p>
          ) : (
            <ul className="reception-team-preview">
              {active.slice(0, 4).map(person => (
                <li key={person.id}>
                  <span className="reception-initials">
                    {(person.full_name || person.username || '?').slice(0, 1)}
                  </span>
                  <div>
                    <strong>{person.full_name ?? person.username}</strong>
                    <small>{person.role === 'barber' ? 'Barbero' : 'Recepcionista'}</small>
                  </div>
                  <span className="online-dot" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="employee-help">
        El resumen corresponde a hoy, en horario de Argentina. Los importes son ingresos por
        servicios, no saldo físico de caja. La cuenta activa de un empleado no indica que esté
        trabajando en este horario.
      </p>
    </div>
  );
}
