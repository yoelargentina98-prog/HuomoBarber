import type { BarberDashboardData } from './service';
import { money } from '../../employees/model/money';
export function WeeklyActivity({ days }: Pick<BarberDashboardData, 'days'>) {
  const max = Math.max(1, ...days.map(day => day.count));
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DÍA A DÍA</span>
          <h2>Actividad semanal</h2>
        </div>
      </div>
      <div className="barber-days">
        {days.map(day => (
          <div key={day.date} className="barber-day">
            <span>
              {new Intl.DateTimeFormat('es-AR', {
                weekday: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(`${day.date}T12:00:00Z`))}
            </span>
            <div className="barber-day-track" aria-hidden="true">
              <div style={{ width: `${(day.count / max) * 100}%` }} />
            </div>
            <strong>{day.count} servicios</strong>
            <small>{money(day.commission)} de comisión</small>
          </div>
        ))}
      </div>
    </section>
  );
}
