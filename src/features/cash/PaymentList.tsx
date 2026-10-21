import type { PageSource } from '../../shared/lib/pages';
import { Paginated } from '../../shared/components/Paginated';
import { money } from '../employees/model/money';
import { serviceDate } from '../employees/model/period';
import { paymentMethods, type Payment } from './model';
import { VoidPayment } from './VoidPayment';
export function PaymentList({
  source,
  payments,
  onSaved,
  canVoid = true,
}: {
  source?: PageSource;
  payments: Payment[];
  onSaved: () => void;
  canVoid?: boolean;
}) {
  if (!source && !payments.length)
    return <p className="empty-copy">No hay cobros registrados para esta fecha y sucursal.</p>;
  return (
    <Paginated items={payments} source={source} cash>
      {pageRows => (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <caption className="employee-help">
              Cobros según su fecha de pago. Los anulados se conservan y no suman.
            </caption>
            <thead>
              <tr>
                <th>FECHA / SERVICIO</th>
                <th>SUCURSAL / BARBERO</th>
                <th>MEDIO</th>
                <th>IMPORTE</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(payment => (
                <tr key={payment.id} className={payment.voided_at ? 'entry-voided' : ''}>
                  <td>
                    <strong>{payment.service_name}</strong>
                    <small className="table-detail">{serviceDate(payment.paid_at)}</small>
                    {payment.reference && (
                      <small className="table-detail">Ref.: {payment.reference}</small>
                    )}
                    {payment.notes && <small className="table-detail">{payment.notes}</small>}
                    <small className="table-detail">Cobro: {payment.id.slice(0, 8)}</small>
                  </td>
                  <td>
                    {payment.branch_name}
                    <small className="table-detail">{payment.barber_name}</small>
                  </td>
                  <td>
                    <span className={`cash-method cash-method-${payment.method}`}>
                      {paymentMethods[payment.method as keyof typeof paymentMethods]}
                    </span>
                  </td>
                  <td>{money(payment.amount_cents)}</td>
                  <td>
                    {payment.voided_at ? (
                      <span>
                        Anulado<small className="table-detail">{payment.void_reason}</small>
                      </span>
                    ) : canVoid ? (
                      <VoidPayment id={payment.id} onSaved={onSaved} />
                    ) : (
                      <span>Registrado</span>
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
