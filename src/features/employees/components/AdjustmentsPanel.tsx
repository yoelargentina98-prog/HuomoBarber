import { Paginated } from '../../../shared/components/Paginated';
import type { EmployeeRecord, MovementKind } from '../model/types';
import { MOVEMENT_KINDS } from '../model/types';
import { money, parseMoney } from '../model/money';
import { serviceDate } from '../model/period';
import { recordAdjustment } from '../services/employee-write';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { VoidEntry } from './VoidEntry';

export function AdjustmentsPanel({
  record,
  month,
  onSaved,
}: {
  record: EmployeeRecord;
  month: string;
  onSaved: () => void;
}) {
  return (
    <div className="dashboard-stack">
      <section className="management-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MOVIMIENTOS DEL MES</span>
            <h2>Extras, bonos y descuentos</h2>
          </div>
        </div>
        <p className="employee-help">
          Se imputan a {month}. Los importes son positivos: los descuentos se restan
          automáticamente.
        </p>
        <SaveForm
          resetOnSuccess
          label="Agregar movimiento"
          onSaved={onSaved}
          save={data =>
            recordAdjustment(
              record.details.employee_id,
              month,
              field(data, 'kind') as MovementKind,
              parseMoney(field(data, 'amount')),
              field(data, 'description')
            )
          }
        >
          <label>
            Tipo
            <select name="kind">
              {Object.entries(MOVEMENT_KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Importe (ARS)
            <input name="amount" inputMode="decimal" required placeholder="0.00" />
          </label>
          <label className="form-wide">
            Concepto
            <input
              name="description"
              required
              minLength={2}
              maxLength={300}
              placeholder="Ej. Bono por objetivo mensual"
            />
          </label>
        </SaveForm>
      </section>
      <section className="management-card">
        <div className="section-heading">
          <h2>Movimientos registrados</h2>
        </div>
        {!record.period && !record.adjustments.length ? (
          <p className="empty-copy">Sin extras, bonos ni descuentos en este período.</p>
        ) : (
          <Paginated
            items={record.adjustments}
            source={
              record.period
                ? {
                    resource: 'employee_adjustments',
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
                      <th>CONCEPTO</th>
                      <th>TIPO</th>
                      <th>IMPORTE</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(item => (
                      <tr key={item.id} className={item.voided_at ? 'entry-voided' : ''}>
                        <td data-label="Concepto">
                          {item.description}
                          <small className="table-detail">{serviceDate(item.created_at)}</small>
                        </td>
                        <td data-label="Tipo">{MOVEMENT_KINDS[item.kind as MovementKind]}</td>
                        <td data-label="Importe">
                          {item.kind === 'deduction' ? '− ' : '+ '}
                          {money(item.amount_cents)}
                        </td>
                        <td data-label="Estado">
                          {item.voided_at ? (
                            <span title={item.void_reason ?? ''}>Anulado</span>
                          ) : (
                            <VoidEntry type="adjustment" id={item.id} onSaved={onSaved} />
                          )}
                        </td>
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
