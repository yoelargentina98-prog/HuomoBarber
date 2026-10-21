import type { PageSource } from '../../../shared/lib/pages';
import { Paginated } from '../../../shared/components/Paginated';
import { useState } from 'react';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { money } from '../../employees/model/money';
import { expenseCategories, voidExpense, type BranchExpense } from './service';
export function ExpenseList({
  expenses,
  source,
  onSaved,
}: {
  expenses: BranchExpense[];
  source?: PageSource;
  onSaved: () => void;
}) {
  const [voiding, setVoiding] = useState<string>();
  return (
    <section className="management-card">
      <div className="section-heading">
        <h2>Gastos del mes</h2>
        {!source && <span className="subtle-tag">{expenses.length} registros</span>}
      </div>
      {!source && !expenses.length ? (
        <p className="empty-copy">No hay gastos cargados para este mes.</p>
      ) : (
        <Paginated items={expenses} source={source}>
          {pageRows => (
            <div className="branch-finance-table-scroll">
              <table role="table" className="branch-finance-table">
                <thead>
                  <tr>
                    <th>Fecha / concepto</th>
                    <th>Categoría</th>
                    <th>Medio</th>
                    <th>Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(expense => (
                    <tr key={expense.id} className={expense.voided_at ? 'expense-voided' : ''}>
                      <td data-label="Fecha y concepto">
                        <strong>{expense.description}</strong>
                        <small>{expense.paid_on.split('-').reverse().join('/')}</small>
                        {expense.notes && <small>{expense.notes}</small>}
                      </td>
                      <td data-label="Categoría">
                        {expenseCategories[expense.category as keyof typeof expenseCategories]}
                      </td>
                      <td data-label="Medio de pago">
                        {expense.method === 'cash' ? 'Efectivo' : 'Transferencia'}
                      </td>
                      <td data-label="Importe">{money(expense.amount_cents)}</td>
                      <td data-label="Estado">
                        {expense.voided_at ? (
                          <>
                            <span>Anulado</span>
                            <small>{expense.void_reason}</small>
                          </>
                        ) : voiding === expense.id ? (
                          <div className="void-entry">
                            <SaveForm
                              label="Confirmar anulación"
                              onSaved={() => {
                                setVoiding(undefined);
                                onSaved();
                              }}
                              save={data => voidExpense(expense.id, field(data, 'reason'))}
                            >
                              <label>
                                Motivo de anulación
                                <input name="reason" required minLength={3} maxLength={300} />
                              </label>
                            </SaveForm>
                            <button className="text-button" onClick={() => setVoiding(undefined)}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button className="text-button" onClick={() => setVoiding(expense.id)}>
                            Anular gasto
                          </button>
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
  );
}
