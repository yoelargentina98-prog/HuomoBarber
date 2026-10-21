import type { EmployeeRecord } from '../model/types';
import { effectiveCompensation, summarize } from '../model/summary';
import { money } from '../model/money';

export function EmployeeOverview({
  record,
  month,
  onConfigure,
}: {
  record: EmployeeRecord;
  month: string;
  onConfigure: () => void;
}) {
  const summary =
    record.summary ?? summarize(record.services, record.adjustments, record.compensation, month);
  return (
    <div className="dashboard-stack">
      {!effectiveCompensation(record.compensation, `${month}-01`) && (
        <div className="data-error">
          <div>
            <strong>Remuneración pendiente de configurar</strong>
            <p>Definí el fijo y las comisiones para este período antes de registrar servicios.</p>
          </div>
          <button className="action-secondary" onClick={onConfigure}>
            Configurar remuneración
          </button>
        </div>
      )}
      <section className="employee-metrics">
        {[
          ['Servicios realizados', summary.count],
          ['Cortes', summary.cuts],
          ['Barbas', summary.beards],
          ['Importe de servicios', money(summary.revenue)],
        ].map(([label, value]) => (
          <article className="management-card" key={label}>
            <span className="eyebrow">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="management-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DESEMPEÑO DEL MES</span>
              <h2>Servicios por categoría</h2>
            </div>
          </div>
          {summary.count === 0 ? (
            <p className="empty-copy">Todavía no hay servicios registrados en este período.</p>
          ) : (
            [
              ['Cortes', summary.cuts],
              ['Barbas', summary.beards],
              ['Otros servicios', summary.others],
            ].map(([name, count]) => (
              <div className="performance-row" key={name}>
                <div>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>
                <div className="performance-track">
                  <span style={{ width: `${(Number(count) / summary.count) * 100}%` }} />
                </div>
              </div>
            ))
          )}
          <p className="employee-help">
            Se cuentan servicios realizados, no turnos ni cobros. Los anulados se conservan en el
            historial y no suman.
          </p>
        </section>
        <section className="management-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">REMUNERACIÓN</span>
              <h2>Estimado del período</h2>
            </div>
          </div>
          <dl className="employee-breakdown">
            <div>
              <dt>Fijo mensual</dt>
              <dd>{money(summary.fixed)}</dd>
            </div>
            <div>
              <dt>Comisiones generadas</dt>
              <dd>{money(summary.commission)}</dd>
            </div>
            <div>
              <dt>Extras y bonos</dt>
              <dd>{money(summary.extras)}</dd>
            </div>
            <div>
              <dt>Descuentos</dt>
              <dd>− {money(summary.deductions)}</dd>
            </div>
            <div className="breakdown-total">
              <dt>Total estimado</dt>
              <dd>{money(summary.estimated)}</dd>
            </div>
          </dl>
          <p className="employee-help">
            Estimación interna. No representa un pago ni una liquidación confirmada. El fijo se toma
            completo, sin prorrateo.
          </p>
        </section>
      </div>
    </div>
  );
}
