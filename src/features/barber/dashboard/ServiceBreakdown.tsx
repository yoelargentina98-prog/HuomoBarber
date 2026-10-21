import { Paginated } from '../../../shared/components/Paginated';
import type { BarberDashboardData } from './service';
import { money } from '../../employees/model/money';
export function ServiceBreakdown({ services }: Pick<BarberDashboardData, 'services'>) {
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TU TRABAJO</span>
          <h2>Servicios de la semana</h2>
        </div>
      </div>
      {!services.length ? (
        <p className="empty-copy">
          Todavía no tenés servicios asignados ni trabajos registrados en esta semana.
        </p>
      ) : (
        <Paginated items={services}>
          {pageRows => (
            <div className="barber-table-scroll">
              <table className="barber-table">
                <thead>
                  <tr>
                    <th scope="col">Servicio</th>
                    <th scope="col">Realizados</th>
                    <th scope="col">Generado</th>
                    <th scope="col">Tu comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(service => (
                    <tr key={service.key}>
                      <th scope="row">
                        {service.name}
                        {!service.assigned && <small>Servicio histórico · ya no asignado</small>}
                        {service.assigned && !service.active && <small>Servicio inactivo</small>}
                      </th>
                      <td className="barber-count-cell" data-label="Realizados">
                        {service.count}
                      </td>
                      <td data-label="Generado">{money(service.revenue)}</td>
                      <td data-label="Tu comisión">{money(service.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Paginated>
      )}
    </section>
  );
}
