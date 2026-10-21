import type { EmployeeRecord } from '../../employees/model/types';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { saveEmployeeBranch } from '../services/branch-service';
import { BranchSelect } from './BranchSelect';
export function EmployeeBranchPanel({
  record,
  onSaved,
}: {
  record: EmployeeRecord;
  onSaved: () => void;
}) {
  return (
    <section className="management-card">
      <div className="section-heading">
        <h2>Sucursal del empleado</h2>
        <span className="subtle-tag">{record.profile.branch_name ?? 'PENDIENTE'}</span>
      </div>
      <p className="employee-help">
        El barbero pertenece a una sola sucursal. Sus precios salen de esa ubicación. Al
        trasladarlo, se conservan los servicios habilitados que estén disponibles en destino y se
        quitan los demás. El historial no cambia.
      </p>
      <SaveForm
        key={record.profile.branch_id ?? 'none'}
        label="Guardar sucursal del empleado"
        onSaved={onSaved}
        save={data => saveEmployeeBranch(record.profile.id, field(data, 'branch_id'))}
      >
        <BranchSelect defaultValue={record.profile.branch_id ?? ''} />
      </SaveForm>
    </section>
  );
}
