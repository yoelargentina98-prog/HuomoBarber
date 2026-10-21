import { useBranches } from '../hooks/useBranches';
export function BranchSelect({
  name = 'branch_id',
  defaultValue = '',
  required = true,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const { branches, loading, error, refresh } = useBranches();
  if (loading)
    return (
      <p role="status" className="employee-help">
        Cargando sucursales…
      </p>
    );
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" className="text-button" onClick={refresh}>
          Reintentar sucursales
        </button>
      </div>
    );
  return (
    <label>
      Sucursal
      <select name={name} required={required} defaultValue={defaultValue}>
        <option value="">Elegí una sucursal</option>
        {branches
          .filter(branch => branch.active || branch.id === defaultValue)
          .map(branch => (
            <option key={branch.id} value={branch.id} disabled={!branch.active}>
              {branch.name}
              {!branch.active ? ' (inactiva)' : ''}
            </option>
          ))}
      </select>
    </label>
  );
}
