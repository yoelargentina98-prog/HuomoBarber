import { SchedulePanel } from '../../schedules/SchedulePanel';
import { BookingBlocksPanel } from '../../appointments/components/BookingBlocksPanel';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { requireSupabaseClient } from '../../../integrations/supabase/client';
import { currentMonth } from '../../employees/model/period';
import type { Branch } from '../services/branch-service';
import { loadBranchExpenses, type BranchExpense } from './service';
import { useBranchBalances } from './useBranchBalances';
import { BalanceCards } from './BalanceCards';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';
import { BranchCommissions } from './BranchCommissions';
import '../../../styles/forms.css';
import './finance.css';
export function BranchDetailPage() {
  const { branchId = '' } = useParams();
  const [month, setMonth] = useState(currentMonth);
  const [revision, setRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const key = `${branchId}/${month}/${revision}`;
  const [state, setState] = useState<{
    key: string;
    branch?: Branch;
    expenses: BranchExpense[];
    error: string;
  }>();
  const balances = useBranchBalances(month, revision);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!/^[0-9a-f-]{36}$/i.test(branchId))
        throw new Error('Identificador de sucursal inválido.');
      const [branch, expenses] = await Promise.all([
        requireSupabaseClient().from('branches').select('*').eq('id', branchId).maybeSingle(),
        loadBranchExpenses(branchId, month),
      ]);
      if (branch.error) throw new Error('No se pudo cargar la sucursal.');
      if (!branch.data) throw new Error('La sucursal no existe o no tenés acceso.');
      if (active) setState({ key, branch: branch.data, expenses, error: '' });
    }
    void load().catch((cause: unknown) => {
      if (active)
        setState({
          key,
          expenses: [],
          error: cause instanceof Error ? cause.message : 'No se pudo cargar la sucursal.',
        });
    });
    return () => {
      active = false;
    };
  }, [branchId, month, key]);
  const current = state?.key === key ? state : undefined;
  const balance = balances.rows.find(row => row.branch_id === branchId);
  function refresh() {
    setRevision(value => value + 1);
  }
  return (
    <div className="dashboard-stack">
      <Link className="text-link" to="/admin/sucursales">
        ← Volver a sucursales
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FICHA DE LA SUCURSAL</span>
          <h1>{current?.branch?.name ?? 'Sucursal'}</h1>
          <p>Ingresos, gastos y saldo de esta ubicación.</p>
        </div>
        <label className="employee-period">
          Mes de la sucursal
          <input
            type="month"
            value={month}
            onChange={event => {
              if (event.target.value) {
                setMonth(event.target.value);
                setAdding(false);
              }
            }}
          />
        </label>
      </div>
      {!current && <p role="status">Cargando sucursal…</p>}
      {current?.error && (
        <div className="data-error" role="alert">
          <p>{current.error}</p>
          <button className="action-secondary" onClick={refresh}>
            Reintentar sucursal
          </button>
        </div>
      )}
      {current?.branch && (
        <>
          <section className="management-card">
            <div className="section-heading">
              <div>
                <span className="role-tag">{current.branch.active ? 'Activa' : 'Inactiva'}</span>
                <p className="employee-help">
                  {current.branch.address || 'Dirección pendiente'} ·{' '}
                  {current.branch.phone || 'Teléfono pendiente'}
                </p>
              </div>
              <div className="form-actions">
                <button className="action-secondary" onClick={refresh}>
                  Actualizar
                </button>
                <button className="action-primary" onClick={() => setAdding(true)}>
                  + Registrar gasto
                </button>
              </div>
            </div>
            {balances.loading ? (
              <p role="status">Cargando balance…</p>
            ) : balances.error ? (
              <div role="alert">
                <p>{balances.error}</p>
                <button className="text-button" onClick={balances.refresh}>
                  Reintentar balance
                </button>
              </div>
            ) : balance ? (
              <BalanceCards rows={[balance]} />
            ) : (
              <p>No se recibió el balance de la sucursal.</p>
            )}
            <p className="employee-help">
              Saldo estimado = cobros − gastos manuales − comisiones generadas por los servicios del
              mes. Las comisiones se descuentan automáticamente, estén pagadas o pendientes. Los
              fijos y otros gastos se cargan por separado. Los anulados no suman.
            </p>
          </section>
          <SchedulePanel branchId={branchId} onSaved={refresh} />
          <BookingBlocksPanel branch={branchId} />
          <BranchCommissions branch={branchId} month={month} revision={revision} />
          {adding && (
            <ExpenseForm
              key={`${branchId}/${month}`}
              branch={branchId}
              month={month}
              onClose={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                refresh();
              }}
            />
          )}
          <ExpenseList
            expenses={current.expenses}
            onSaved={refresh}
            source={{
              resource: 'branch_expenses',
              filters: { branch: branchId, month: `${month}-01` },
              revision,
            }}
          />
        </>
      )}
    </div>
  );
}
