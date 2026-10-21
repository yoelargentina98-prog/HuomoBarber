import type { PageSource } from '../../../shared/lib/pages';
import { Paginated } from '../../../shared/components/Paginated';
import type { AuditEvent } from '../model/types';
import { serviceDate } from '../model/period';
import { money } from '../model/money';
import type { Json } from '../../../integrations/supabase/types';
import { describeSchedule } from '../../schedules/audit';

const entities: Record<string, string> = {
  cash_payments: 'Cobro en Caja',
  barber_schedules: 'Horarios de actividad',
  barber_services: 'Servicios habilitados',
  employee_services: 'Servicio',
  employee_adjustments: 'Extra, bono o descuento',
  employee_compensation: 'Condiciones de remuneración',
  employee_details: 'Ficha laboral',
  profiles: 'Datos personales',
};
const fields: Record<string, string> = {
  weekly: 'Semana habitual',
  exceptions: 'Excepciones por fecha',
  full_name: 'Nombre',
  branch_id: 'Sucursal (ID)',
  branch_name: 'Sucursal',
  phone: 'Teléfono',
  active: 'Activo',
  hire_date: 'Ingreso',
  notes: 'Notas',
  commission_percent: 'Comisión por servicio',
  monthly_fixed_cents: 'Fijo mensual',
  amount_cents: 'Importe',
  method: 'Medio de pago',
  paid_at: 'Fecha del cobro',
  reference: 'Referencia',
  service_name: 'Servicio',
  description: 'Concepto',
  void_reason: 'Motivo de anulación',
  effective_from: 'Vigencia',
  voided_at: 'Anulado el',
};
function asObject(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function show(key: string, value: Json | undefined): string {
  if (value == null) return 'Sin definir';
  if (key === 'method') return value === 'cash' ? 'Efectivo' : 'Transferencia';
  if (key === 'weekly' || key === 'exceptions') return describeSchedule(value, key === 'weekly');
  if (key.endsWith('_cents') && typeof value === 'number') return money(value);
  if (key.endsWith('_percent')) return `${value}%`;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}
export function ActivityPanel({ audit, source }: { audit: AuditEvent[]; source?: PageSource }) {
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TRAZABILIDAD</span>
          <h2>Actividad de la ficha</h2>
        </div>
      </div>
      <p className="employee-help">
        Movimientos de administración, en páginas de 20 registros, independientemente del mes
        seleccionado.
      </p>
      {!source && !audit.length ? (
        <p className="empty-copy">Todavía no se registraron cambios en esta ficha.</p>
      ) : (
        <Paginated items={audit} source={source}>
          {pageRows => (
            <ol className="employee-timeline">
              {pageRows.map(event => {
                const before = asObject(event.before_data);
                const after = asObject(event.after_data);
                const snapshot = event.action === 'DELETE' ? before : after;
                const changes = Object.keys(fields).filter(
                  key =>
                    key in snapshot &&
                    (event.action === 'DELETE' ||
                      JSON.stringify(before[key]) !== JSON.stringify(after[key]))
                );
                return (
                  <li key={event.id}>
                    <div>
                      <strong>
                        {entities[event.entity] ?? 'Registro'} ·{' '}
                        {event.action === 'INSERT'
                          ? 'Registrado'
                          : event.action === 'DELETE'
                            ? 'Quitado'
                            : 'Actualizado'}
                      </strong>
                      <time dateTime={event.created_at}>{serviceDate(event.created_at)}</time>
                    </div>
                    <ul>
                      {changes.map(key => (
                        <li key={key}>
                          {fields[key]}:{' '}
                          {event.action === 'UPDATE' && (
                            <>
                              <span>{show(key, before[key])}</span> →{' '}
                            </>
                          )}
                          {show(key, snapshot[key])}
                        </li>
                      ))}
                    </ul>
                    <small>
                      {event.actor_id
                        ? `Usuario · ${event.actor_id.slice(0, 8)}`
                        : 'Operación del sistema'}
                    </small>
                  </li>
                );
              })}
            </ol>
          )}
        </Paginated>
      )}
    </section>
  );
}
