import { useState } from 'react';
import { useBranches } from '../branches/hooks/useBranches';
import { money } from '../employees/model/money';
import { today } from '../employees/model/period';
import { cashSummary, type PendingService } from './model';
import { useCashDay } from './useCashDay';
import { PaymentList } from './PaymentList';
import { PendingList } from './PendingList';
import { CollectForm } from './CollectForm';
import { NewSale } from './sales/NewSale';
import type { CashOperator } from './sales/service';
import '../staff/staff.css';
import '../employees/styles/employee.css';
import './cash.css';

export function CashPage({
  operator,
  initialBranch = '',
  startSale = false,
}: {
  operator?: CashOperator;
  initialBranch?: string;
  startSale?: boolean;
}) {
  const [day, setDay] = useState(today);
  const [chosenBranch, setBranch] = useState(initialBranch);
  const branch = operator?.role === 'reception' ? (operator.branchId ?? '') : chosenBranch;
  const reception = operator?.role === 'reception';
  const [newSale, setNewSale] = useState(startSale);
  const [method, setMethod] = useState('all');
  const [selected, setSelected] = useState<PendingService>();
  const [notice, setNotice] = useState('');
  const { branches, error: branchError, refresh: refreshBranches } = useBranches();
  const { data, loading, error, refresh, revision } = useCashDay(day, branch);
  const summary = data ? (data.summary ?? cashSummary(data.payments)) : undefined;
  function reload() {
    setSelected(undefined);
    setNotice('');
    refresh();
  }
  function saved(message: string) {
    setNewSale(false);
    setSelected(undefined);
    setNotice(message);
    refresh();
  }
  return (
    <div className="dashboard-stack cash-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">COBROS DEL NEGOCIO</span>
          <h1>Caja</h1>
          <p>Efectivo y transferencias, con cada cobro vinculado a su servicio.</p>
        </div>
        <button
          className="action-primary"
          onClick={() => {
            setNewSale(true);
            setDay(today());
            setSelected(undefined);
          }}
        >
          Nueva venta
        </button>
        <button
          className="action-secondary"
          disabled={loading}
          onClick={() => {
            setNewSale(false);
            reload();
          }}
        >
          Actualizar Caja
        </button>
      </div>
      <section className="management-card">
        <div className="cash-filters">
          <label>
            Fecha de Caja
            <input
              type="date"
              value={day}
              onChange={event => {
                if (event.target.value) {
                  setDay(event.target.value);
                  setSelected(undefined);
                  setNotice('');
                }
              }}
            />
          </label>
          {!reception ? (
            <label>
              Sucursal
              <select
                value={branch}
                onChange={event => {
                  setBranch(event.target.value);
                  setNewSale(false);
                  setSelected(undefined);
                  setNotice('');
                }}
              >
                <option value="">Todas las sucursales</option>
                {branches.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {!item.active ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              Sucursal: <strong>{operator.branchName}</strong>
            </p>
          )}
          <button
            className="text-button"
            onClick={() => {
              setDay(today());
              setSelected(undefined);
              setNotice('');
            }}
          >
            Hoy
          </button>
        </div>
        {branchError && (
          <div role="alert">
            <p>{branchError}</p>
            <button className="text-button" onClick={refreshBranches}>
              Reintentar sucursales
            </button>
          </div>
        )}
        <p className="employee-help">
          Los totales usan la fecha del cobro en horario de Argentina. Las transferencias son
          registros manuales; todavía no se verifican contra Mercado Pago o el banco.
        </p>
        {summary && (
          <div className="cash-totals" aria-label="Resumen de Caja">
            <article>
              <span>Total cobrado</span>
              <strong>{money(summary.total)}</strong>
              <small>{summary.cashCount + summary.transferCount} cobros vigentes</small>
            </article>
            <article>
              <span>Efectivo</span>
              <strong>{money(summary.cash)}</strong>
              <small>{summary.cashCount} cobros</small>
            </article>
            <article>
              <span>Transferencias</span>
              <strong>{money(summary.transfer)}</strong>
              <small>{summary.transferCount} cobros</small>
            </article>
          </div>
        )}
        <p className="employee-help">
          Este resumen muestra ingresos por servicios. No incluye fondo inicial, gastos, retiros ni
          cierre de caja.
        </p>
      </section>
      {newSale && (
        <NewSale
          key={branch}
          branch={branch}
          branches={branches}
          branchName={operator?.branchName}
          onChooseBranch={reception ? undefined : setBranch}
          onCancel={() => setNewSale(false)}
          onSaved={() => saved('Venta registrada: servicio, comisión y cobro guardados.')}
        />
      )}
      {notice && (
        <p role="status" className="employee-success">
          {notice}
        </p>
      )}
      {loading && <p role="status">Cargando Caja…</p>}
      {error && (
        <div className="data-error" role="alert">
          <p>{error}</p>
          <button className="action-secondary" onClick={reload}>
            Reintentar Caja
          </button>
        </div>
      )}
      {data && (
        <>
          <section className="management-card">
            <div className="section-heading">
              <h2>Cobros registrados</h2>
              <label className="cash-medium">
                Medio de pago
                <select value={method} onChange={event => setMethod(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </label>
            </div>
            <PaymentList
              canVoid={!reception}
              source={
                data.paginated
                  ? { resource: 'cash_payments', filters: { day, branch, method }, revision }
                  : undefined
              }
              payments={data.payments.filter(
                payment => method === 'all' || payment.method === method
              )}
              onSaved={() =>
                saved('Cobro anulado. El servicio vuelve a quedar pendiente de cobro.')
              }
            />
          </section>
          <section className="management-card">
            <div className="section-heading">
              <h2>Servicios pendientes de cobro</h2>
              <span className="staff-count">
                {data.summary?.pendingCount ?? data.pending.length} servicios
              </span>
            </div>
            <p className="employee-help">
              Servicios realizados en la fecha seleccionada que no tienen un cobro vigente. Para
              cobrar trabajos de otro día, cambiá la fecha. Los registros anteriores a Caja no se
              marcan como pagados automáticamente: revisalos antes de cobrar.
            </p>
            {selected && (
              <CollectForm
                key={selected.id}
                service={selected}
                onCancel={() => setSelected(undefined)}
                onSaved={() =>
                  saved('Cobro registrado. Consultalo en la fecha de pago que indicaste.')
                }
              />
            )}
            <PendingList
              linkEmployees={!reception}
              source={
                data.paginated
                  ? { resource: 'cash_pending', filters: { day, branch }, revision }
                  : undefined
              }
              services={data.pending}
              onCollect={service => {
                setSelected(service);
                setNotice('');
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
