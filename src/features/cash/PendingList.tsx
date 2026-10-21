import type { PageSource } from '../../shared/lib/pages';
import { Paginated } from '../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import { money } from '../employees/model/money';
import { serviceDate } from '../employees/model/period';
import type { PendingService } from './model';
export function PendingList({
  source,
  services,
  onCollect,
  linkEmployees = true,
}: {
  source?: PageSource;
  services: PendingService[];
  onCollect: (service: PendingService) => void;
  linkEmployees?: boolean;
}) {
  if (!source && !services.length)
    return (
      <p className="empty-copy">No hay servicios pendientes de cobro realizados en esta fecha.</p>
    );
  return (
    <Paginated items={services} source={source} cash>
      {pageRows => (
        <div className="staff-table-wrapper">
          <table role="table" className="staff-table">
            <thead>
              <tr>
                <th>SERVICIO / FECHA</th>
                <th>BARBERO / SUCURSAL</th>
                <th>IMPORTE</th>
                <th>COBRO</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(service => (
                <tr key={service.id}>
                  <td data-label="Servicio y fecha">
                    <strong>{service.service_name}</strong>
                    <small className="table-detail">{serviceDate(service.performed_at)}</small>
                  </td>
                  <td data-label="Barbero y sucursal">
                    {linkEmployees ? (
                      <Link to={`/admin/personal/${service.employee_id}`}>
                        {service.barber_name}
                      </Link>
                    ) : (
                      service.barber_name
                    )}
                    <small className="table-detail">
                      {service.branch_name ?? 'Sin sucursal histórica'}
                    </small>
                  </td>
                  <td data-label="Importe">{money(service.amount_cents)}</td>
                  <td data-label="Cobro">
                    {service.branch_id ? (
                      <button className="action-secondary" onClick={() => onCollect(service)}>
                        Cobrar
                      </button>
                    ) : (
                      <span>Requiere revisión de sucursal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paginated>
  );
}
