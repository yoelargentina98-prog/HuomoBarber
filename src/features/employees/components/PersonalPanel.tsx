import { useState } from 'react';
import type { EmployeeRecord } from '../model/types';
import { savePersonal, setEmployeeActive } from '../services/employee-write';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { EmployeeBranchPanel } from '../../branches/components/EmployeeBranchPanel';

export function PersonalPanel({
  record,
  onSaved,
}: {
  record: EmployeeRecord;
  onSaved: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function changeStatus() {
    setBusy(true);
    setError('');
    try {
      await setEmployeeActive(record.details.employee_id, !record.details.active);
      setConfirm(false);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dashboard-stack">
      <EmployeeBranchPanel record={record} onSaved={onSaved} />
      <section className="management-card">
        <div className="section-heading">
          <h2>Datos del empleado</h2>
          <span className="subtle-tag">
            {record.profile.role === 'barber' ? 'BARBERO' : 'RECEPCIÓN'}
          </span>
        </div>
        <SaveForm
          key={record.profile.id}
          onSaved={onSaved}
          save={data =>
            savePersonal(
              record.profile.id,
              field(data, 'name'),
              field(data, 'phone'),
              field(data, 'hire_date'),
              field(data, 'notes')
            )
          }
        >
          <label>
            Nombre completo
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={record.profile.full_name ?? ''}
            />
          </label>
          <label>
            Teléfono
            <input
              name="phone"
              type="tel"
              maxLength={30}
              defaultValue={record.profile.phone ?? ''}
            />
          </label>
          <label>
            Fecha de ingreso
            <input name="hire_date" type="date" required defaultValue={record.details.hire_date} />
          </label>
          <label>
            Nombre de usuario
            <input readOnly value={record.profile.username ?? ''} />
          </label>
          <label className="form-wide">
            Notas internas
            <textarea name="notes" maxLength={5000} rows={4} defaultValue={record.details.notes} />
          </label>
        </SaveForm>
        <p className="employee-help">
          Las notas son privadas para administración. La fecha de ingreso no prorratea el fijo
          automáticamente.
        </p>
      </section>
      <section className="management-card">
        <div className="section-heading">
          <h2>Estado y acceso</h2>
          <span className={`role-tag ${record.details.active ? 'role-barber' : 'role-reception'}`}>
            {record.details.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <p className="employee-help">
          Desactivar impide nuevos ingresos y nuevos servicios. Conserva todo el historial y los
          importes ya registrados. Las sesiones existentes pueden durar hasta que venza su token.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {!confirm ? (
          <button className="action-secondary" onClick={() => setConfirm(true)}>
            {record.details.active ? 'Desactivar empleado' : 'Reactivar empleado'}
          </button>
        ) : (
          <div className="employee-confirm">
            <p>
              ¿Confirmás que querés {record.details.active ? 'desactivar' : 'reactivar'} a{' '}
              {record.profile.full_name}?
            </p>
            <button className="action-primary" disabled={busy} onClick={() => void changeStatus()}>
              {busy ? 'Actualizando…' : 'Confirmar cambio'}
            </button>
            <button className="action-secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
