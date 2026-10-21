import { useState } from 'react';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { parseMoney } from '../../employees/model/money';
import { currentMonth, today } from '../../employees/model/period';
import { expenseCategories, saveExpense } from './service';
export function ExpenseForm({
  branch,
  month,
  onSaved,
  onClose,
}: {
  branch: string;
  month: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [operation] = useState(() => crypto.randomUUID());
  return (
    <section className="management-card">
      <div className="section-heading">
        <h2>Registrar gasto pagado</h2>
        <button className="text-button" onClick={onClose}>
          Cerrar formulario
        </button>
      </div>
      <SaveForm
        label="Guardar gasto"
        onSaved={onSaved}
        save={data =>
          saveExpense(branch, operation, {
            category: field(data, 'category'),
            description: field(data, 'description').trim(),
            amount: parseMoney(field(data, 'amount')),
            date: field(data, 'date'),
            method: field(data, 'method'),
            notes: field(data, 'notes').trim(),
          })
        }
      >
        <label>
          Categoría
          <select name="category" required defaultValue="">
            <option value="">Elegí una categoría</option>
            {Object.entries(expenseCategories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Concepto
          <input
            name="description"
            required
            minLength={3}
            maxLength={300}
            placeholder="Ej.: factura de luz de octubre"
          />
        </label>
        <label>
          Importe (ARS)
          <input name="amount" required inputMode="decimal" placeholder="Ej.: 45000,50" />
        </label>
        <label>
          Fecha de pago
          <input
            name="date"
            type="date"
            required
            defaultValue={month === currentMonth() ? today() : `${month}-01`}
            max={today()}
          />
        </label>
        <label>
          Cómo se pagó
          <select name="method" required defaultValue="">
            <option value="">Elegí el medio de pago</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
        </label>
        <label>
          Notas (opcional)
          <input name="notes" maxLength={1000} />
        </label>
      </SaveForm>
      <p className="employee-help">
        Cargá gastos ya pagados. Si hubo un error de conexión, actualizá el listado antes de iniciar
        otro registro. El saldo se actualiza según la fecha de pago.
      </p>
    </section>
  );
}
