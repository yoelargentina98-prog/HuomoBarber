import { Paginated } from '../../../shared/components/Paginated';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BranchComparison } from '../finance/BranchComparison';
import { useBranches } from '../hooks/useBranches';
import { saveBranch, setBranchActive, type Branch } from '../services/branch-service';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import '../../../styles/forms.css';
export function BranchesPage() {
  const { branches, loading, error, refresh } = useBranches();
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const current = editing && editing !== 'new' ? editing : undefined;
  async function toggle(branch: Branch) {
    setBusy(branch.id);
    setActionError('');
    try {
      await setBranchActive(branch.id, !branch.active);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="dashboard-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU NEGOCIO, EN CADA UBICACIÓN</span>
          <h1>Sucursales</h1>
          <p>Creá y administrá las sucursales actuales y futuras de Huomo.</p>
        </div>
        <button className="action-primary" onClick={() => setEditing('new')}>
          + Nueva sucursal
        </button>
      </div>
      {editing && (
        <section className="management-card">
          <div className="section-heading">
            <h2>{current ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
            <button className="text-button" onClick={() => setEditing(null)}>
              Cerrar
            </button>
          </div>
          <SaveForm
            key={current?.id ?? 'new'}
            label="Guardar sucursal"
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            save={data =>
              saveBranch(
                {
                  name: field(data, 'name'),
                  address: field(data, 'address'),
                  phone: field(data, 'phone'),
                },
                current?.id
              )
            }
          >
            <label>
              Nombre de la sucursal
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={current?.name ?? ''}
              />
            </label>
            <label>
              Teléfono
              <input name="phone" type="tel" maxLength={30} defaultValue={current?.phone ?? ''} />
            </label>
            <label className="form-wide">
              Dirección
              <input name="address" maxLength={300} defaultValue={current?.address ?? ''} />
            </label>
          </SaveForm>
        </section>
      )}
      {(error || actionError) && (
        <div className="data-error" role="alert">
          <p>{error || actionError}</p>
          <button
            className="action-secondary"
            onClick={() => {
              setActionError('');
              refresh();
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Cargando sucursales…</p>
      ) : (
        <Paginated items={branches}>
          {pageRows => (
            <section className="metrics-grid">
              {pageRows.map(branch => (
                <article className="management-card" key={branch.id}>
                  <div className="section-heading">
                    <h2>
                      <Link className="branch-title-link" to={`/sucursal/${branch.id}`}>
                        {branch.name} →
                      </Link>
                    </h2>
                    <span
                      className={`role-tag ${branch.active ? 'role-barber' : 'role-reception'}`}
                    >
                      {branch.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="employee-help">
                    {branch.address || 'Dirección pendiente'}
                    <br />
                    {branch.phone || 'Teléfono pendiente'}
                  </p>
                  <div className="form-actions">
                    <Link className="text-link" to={`/sucursal/${branch.id}`}>
                      Ver balance y gastos
                    </Link>
                    <button className="text-button" onClick={() => setEditing(branch)}>
                      Editar
                    </button>
                    <button
                      className="text-button"
                      disabled={busy !== null}
                      onClick={() => void toggle(branch)}
                    >
                      {busy === branch.id
                        ? 'Guardando…'
                        : branch.active
                          ? 'Desactivar'
                          : 'Reactivar'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </Paginated>
      )}
      <BranchComparison />
      <p className="employee-help">
        Podés agregar nuevas sucursales cuando lo necesites. Desactivar una sucursal conserva su
        historial e impide nuevos trabajos en ella.
      </p>
    </div>
  );
}
