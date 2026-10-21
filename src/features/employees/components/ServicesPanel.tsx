import { Paginated } from '../../../shared/components/Paginated';
import { RecordServiceForm } from '../../catalog/components/RecordServiceForm';
import { useState } from 'react';
import type { EmployeeRecord, ServiceCategory } from '../model/types';
import { SERVICE_CATEGORIES } from '../model/types';
import { money } from '../model/money';
import { serviceDate } from '../model/period';
import { VoidEntry } from './VoidEntry';

export function ServicesPanel({
  record,
  onSaved,
  onAssign,
}: {
  record: EmployeeRecord;
  onSaved: () => void;
  onAssign: () => void;
}) {
  const [open, setOpen] = useState(false);
  const canRecord = record.profile.role === 'barber' && record.details.active;
  return (
    <div className="dashboard-stack">
      <section className="management-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HISTORIAL DEL PERÍODO</span>
            <h2>Servicios realizados</h2>
          </div>
          {canRecord && (
            <button className="action-primary" onClick={() => setOpen(!open)}>
              {open ? 'Cerrar formulario' : 'Registrar servicio'}
            </button>
          )}
        </div>
        {!canRecord && (
          <p className="employee-help">
            Solo los barberos activos pueden recibir nuevos servicios.
          </p>
        )}
        {open && canRecord && (
          <RecordServiceForm
            employeeId={record.profile.id}
            onAssign={onAssign}
            onSaved={() => {
              setOpen(false);
              onSaved();
            }}
          />
        )}
        {!record.period && !record.services.length ? (
          <p className="empty-copy">No hay servicios registrados en este mes.</p>
        ) : (
          <Paginated
            items={record.services}
            source={
              record.period
                ? {
                    resource: 'employee_services',
                    filters: { employee: record.profile.id, month: `${record.period}-01` },
                    revision: record.version,
                  }
                : undefined
            }
          >
            {pageRows => (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>FECHA / SERVICIO</th>
                      <th>TIPO</th>
                      <th>IMPORTE</th>
                      <th>COMISIÓN</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(item => (
                      <tr key={item.id} className={item.voided_at ? 'entry-voided' : ''}>
                        <td>
                          <strong>{item.service_name}</strong>
                          <small className="table-detail">{serviceDate(item.performed_at)}</small>
                          <small className="table-detail">
                            {item.branch_name ?? 'Sucursal no registrada (histórico)'}
                          </small>
                          {item.notes && <small className="table-detail">{item.notes}</small>}
                        </td>
                        <td>{SERVICE_CATEGORIES[item.category as ServiceCategory]}</td>
                        <td>{money(item.amount_cents)}</td>
                        <td>
                          {money(item.commission_cents ?? 0)}
                          <small className="table-detail">{item.commission_percent}%</small>
                        </td>
                        <td>
                          {item.voided_at ? (
                            <span title={item.void_reason ?? ''}>Anulado</span>
                          ) : (
                            <VoidEntry id={item.id} type="service" onSaved={onSaved} />
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
