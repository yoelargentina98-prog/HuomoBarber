import { useState } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { moneyInput, parseMoney } from '../../employees/model/money';
import { today } from '../../employees/model/period';
import { recordService } from '../../employees/services/employee-write';

export function RecordServiceForm({
  employeeId,
  onSaved,
  onAssign,
}: {
  employeeId: string;
  onSaved: () => void;
  onAssign: () => void;
}) {
  const { catalog, assigned, loading, error, refresh, branchName } = useCatalog(employeeId);
  const [selected, setSelected] = useState('');
  const available = catalog.filter(service => service.active && assigned.includes(service.id));
  const service = available.find(item => item.id === selected);
  if (loading)
    return (
      <p role="status" className="employee-help">
        Cargando servicios habilitados…
      </p>
    );
  if (error)
    return (
      <div className="data-error" role="alert">
        <p>{error}</p>
        <button className="action-secondary" onClick={refresh}>
          Reintentar
        </button>
      </div>
    );
  if (!available.length)
    return (
      <div className="empty-team">
        <h3>Este barbero no tiene servicios activos asignados</h3>
        <p>Elegí primero qué servicios del catálogo realiza.</p>
        <button className="action-primary" onClick={onAssign}>
          Asignar servicios
        </button>
      </div>
    );
  return (
    <div className="employee-editor">
      {branchName && (
        <p className="employee-help">
          Sucursal del trabajo: {branchName}. El precio propuesto es la tarifa actual de esta
          sucursal.
        </p>
      )}
      <SaveForm
        label="Registrar servicio realizado"
        onSaved={onSaved}
        save={data =>
          recordService(
            employeeId,
            field(data, 'service_id'),
            `${field(data, 'date')}-03:00`,
            parseMoney(field(data, 'amount')),
            field(data, 'notes')
          )
        }
      >
        <label>
          Servicio del catálogo
          <select
            name="service_id"
            required
            value={selected}
            onChange={event => setSelected(event.target.value)}
          >
            <option value="">Elegí un servicio habilitado</option>
            {available.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha y hora (Argentina)
          <input
            name="date"
            type="datetime-local"
            required
            defaultValue={`${today()}T${new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())}`}
          />
        </label>
        <label>
          Importe del servicio (ARS)
          <input
            key={service?.id ?? 'none'}
            name="amount"
            inputMode="decimal"
            required
            defaultValue={service ? moneyInput(service.price_cents) : ''}
            placeholder="Seleccioná un servicio"
          />
        </label>
        <label>
          Notas
          <input name="notes" maxLength={1000} />
        </label>
      </SaveForm>
      <p className="employee-help">
        Se propone el precio del catálogo, que podés ajustar para este trabajo. El servidor verifica
        la asignación y aplica la única comisión del empleado. Esto no registra un cobro en caja.
      </p>
    </div>
  );
}
