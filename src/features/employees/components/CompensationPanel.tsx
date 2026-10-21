import { Paginated } from '../../../shared/components/Paginated';
import type { EmployeeRecord } from '../model/types';
import { effectiveCompensation } from '../model/summary';
import { money, moneyInput, parseMoney, parsePercent } from '../model/money';
import { saveCompensation } from '../services/employee-write';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';

export function CompensationPanel({
  record,
  month,
  onSaved,
}: {
  record: EmployeeRecord;
  month: string;
  onSaved: () => void;
}) {
  const config = effectiveCompensation(record.compensation, `${month}-01`);
  return (
    <div className="dashboard-stack">
      <section className="management-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONDICIONES ECONÓMICAS</span>
            <h2>Fijo y comisión</h2>
          </div>
          <span className="subtle-tag">ARS</span>
        </div>
        <p className="employee-help">
          Configuración para {month}. El mismo porcentaje se aplica al importe de cualquier servicio
          realizado por este empleado. Por ejemplo: 30% de un servicio de $20.000 son $6.000 de
          comisión.
        </p>
        <SaveForm
          key={`${record.details.employee_id}/${month}/${config?.id ?? 'new'}`}
          onSaved={onSaved}
          save={data =>
            saveCompensation({
              employee_id: record.details.employee_id,
              effective_from: `${month}-01`,
              commission_percent: parsePercent(field(data, 'commission')),
              monthly_fixed_cents: parseMoney(field(data, 'fixed')),
            })
          }
        >
          <label>
            Fijo mensual (ARS)
            <input
              name="fixed"
              inputMode="decimal"
              required
              defaultValue={moneyInput(config?.monthly_fixed_cents ?? 0)}
            />
          </label>
          <label>
            Comisión por servicio (%)
            <input
              name="commission"
              inputMode="decimal"
              required
              defaultValue={config?.commission_percent ?? 0}
            />
          </label>
        </SaveForm>
        <p className="employee-help">
          Rige desde el primer día del mes hasta una nueva configuración. Los servicios ya
          registrados mantienen su comisión original.
        </p>
      </section>
      <section className="management-card">
        <div className="section-heading">
          <h2>Historial de condiciones</h2>
        </div>
        {!record.period && !record.compensation.length ? (
          <p className="empty-copy">
            Todavía no hay condiciones configuradas. Guardalas antes de registrar el primer
            servicio.
          </p>
        ) : (
          <Paginated
            items={record.compensation}
            source={
              record.period
                ? {
                    resource: 'employee_compensation',
                    filters: { employee: record.profile.id, month: `${record.period}-01` },
                    revision: record.version,
                  }
                : undefined
            }
          >
            {pageRows => (
              <div className="staff-table-wrapper">
                <table role="table" className="staff-table">
                  <thead>
                    <tr>
                      <th>VIGENCIA DESDE</th>
                      <th>FIJO MENSUAL</th>
                      <th>COMISIÓN POR SERVICIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(item => (
                      <tr key={item.id}>
                        <td data-label="Vigencia desde">{item.effective_from}</td>
                        <td data-label="Fijo mensual">{money(item.monthly_fixed_cents)}</td>
                        <td data-label="Comisión por servicio">{item.commission_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Paginated>
        )}
      </section>
    </div>
  );
}
