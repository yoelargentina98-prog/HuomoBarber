import { useEffect, useState } from 'react';
import { shiftDate, weekLabel, weekStart } from '../../staff/dashboard/model';
import { money } from '../../employees/model/money';
import { loadBarberDashboard, type BarberDashboardData } from './service';
import { ServiceBreakdown } from './ServiceBreakdown';
import { WeeklyActivity } from './WeeklyActivity';
import { RecentServices } from './RecentServices';
import './dashboard.css';
import { AdminIcon } from '../../admin/components/AdminIcon';
import { barberSections, type BarberSection } from '../components/model';
import { BarberAgenda } from './BarberAgenda';
export function BarberDashboard({
  employeeId,
  section = 'overview',
}: {
  employeeId: string;
  section?: BarberSection;
}) {
  const [week, setWeek] = useState(weekStart);
  const [revision, setRevision] = useState(0);
  const key = `${employeeId}/${week}/${revision}`;
  const [state, setState] = useState<{ key: string; data?: BarberDashboardData; error?: string }>();
  useEffect(() => {
    let active = true;
    loadBarberDashboard(week)
      .then(data => {
        if (active) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            error: cause instanceof Error ? cause.message : 'No se pudo cargar tu resumen.',
          });
      });
    return () => {
      active = false;
    };
  }, [week, key]);
  const current = state?.key === key ? state : undefined;
  const data = current?.data;
  return (
    <div className="dashboard-stack barber-dashboard">
      <section className="management-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TU SEMANA EN HUOMO</span>
            <h2>
              {section === 'overview' ? 'Mi desempeño semanal' : barberSections[section].label}
            </h2>
            <p className="employee-help">{weekLabel(week)} · lunes a domingo</p>
          </div>
          <button className="action-secondary" onClick={() => setRevision(value => value + 1)}>
            Actualizar mi resumen
          </button>
        </div>
        <div className="barber-week">
          <button
            className="action-secondary"
            aria-label="Semana anterior"
            onClick={() => setWeek(value => shiftDate(value, -7))}
          >
            ←
          </button>
          <label>
            Semana del
            <input
              type="date"
              value={week}
              onChange={event => {
                if (event.target.value) setWeek(weekStart(event.target.value));
              }}
            />
          </label>
          <button
            className="action-secondary"
            aria-label="Semana siguiente"
            onClick={() => setWeek(value => shiftDate(value, 7))}
          >
            →
          </button>
          <button className="action-secondary" onClick={() => setWeek(weekStart())}>
            Esta semana
          </button>
        </div>
      </section>
      {!current && <p role="status">Cargando mi caja…</p>}
      {current?.error && (
        <div role="alert" className="data-error">
          <p>{current.error}</p>
          <button className="action-secondary" onClick={() => setRevision(value => value + 1)}>
            Reintentar resumen
          </button>
        </div>
      )}
      {data && (
        <>
          {['overview', 'earnings'].includes(section) && (
            <>
              <div className="barber-metrics">
                <article>
                  <span className="barber-metric-icon">
                    <AdminIcon name="wallet" />
                  </span>
                  <span>Mi comisión semanal</span>
                  <strong>{money(data.commission)}</strong>
                  <small>Generada por tus servicios</small>
                </article>
                <article>
                  <span className="barber-metric-icon">
                    <AdminIcon name="scissors" />
                  </span>
                  <span>Servicios realizados</span>
                  <strong>{data.count}</strong>
                  <small>Sin servicios anulados</small>
                </article>
                <article>
                  <span className="barber-metric-icon">
                    <AdminIcon name="dashboard" />
                  </span>
                  <span>Generado en servicios</span>
                  <strong>{money(data.revenue)}</strong>
                  <small>Importe de tus trabajos</small>
                </article>
              </div>
              {data.fixed != null && data.fixed > 0 && (
                <section className="management-card barber-fixed">
                  <span className="eyebrow">FIJO MENSUAL</span>
                  <h2>{money(data.fixed)}</h2>
                  <p>
                    Correspondiente a{' '}
                    {new Intl.DateTimeFormat('es-AR', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${data.fixedMonth}T12:00:00Z`))}
                    . Es independiente de la semana seleccionada y se muestra sin prorrateo.
                  </p>
                </section>
              )}
              <p className="employee-help">
                Tu caja muestra producción y comisión generada, no pagos de sueldo ni saldo
                disponible. Los cobros a clientes los administra recepción. No incluye extras, bonos
                o descuentos.
              </p>
            </>
          )}
          {['services', 'earnings'].includes(section) && (
            <ServiceBreakdown services={data.services} />
          )}
          {['overview', 'agenda'].includes(section) && (
            <div className={section === 'overview' ? 'barber-columns' : undefined}>
              {section === 'overview' && <WeeklyActivity days={data.days} />}
              <BarberAgenda />
            </div>
          )}
          {section === 'overview' && <ServiceBreakdown services={data.services} />}
          {section === 'history' && <RecentServices key={week} week={week} revision={revision} />}
        </>
      )}
    </div>
  );
}
