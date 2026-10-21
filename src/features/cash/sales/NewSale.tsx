import { useEffect, useId, useRef, useState } from 'react';
import { saleOptions, saleSetup, type SaleOption, type SaleSetup } from './service';
import { SaleFields } from './SaleFields';
import { SaleSetupMessage } from './SaleSetupMessage';
import { useModalRegistration } from '../../../shared/native/modal-stack';
export function NewSale({
  branch,
  onSaved,
  onCancel,
  branches = [],
  onChooseBranch,
  branchName,
}: {
  branch: string;
  onSaved: () => void;
  onCancel: () => void;
  branches?: { id: string; name: string; active: boolean }[];
  onChooseBranch?: (id: string) => void;
  branchName?: string | null;
}) {
  useModalRegistration(true, onCancel);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  const [revision, setRevision] = useState(0);
  const key = `${branch}/${revision}`;
  const [state, setState] = useState<{
    key: string;
    options?: SaleOption[];
    setup?: SaleSetup;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    if (branch)
      saleOptions(branch)
        .then(async options => {
          const setup = options.length ? undefined : await saleSetup(branch);
          if (active) setState({ key, options, setup });
        })
        .catch((cause: unknown) => {
          if (active)
            setState({
              key,
              error: cause instanceof Error ? cause.message : 'No se pudieron cargar las opciones.',
            });
        });
    return () => {
      active = false;
    };
  }, [branch, key]);
  const current = state?.key === key ? state : undefined;
  return (
    <dialog
      ref={dialog}
      className="sale-modal"
      aria-labelledby={title}
      onCancel={event => {
        event.preventDefault();
        onCancel();
      }}
    >
      <section className="management-card">
        <div className="section-heading">
          <h2 id={title}>Nueva venta</h2>
          <button className="text-button" onClick={onCancel}>
            Cerrar formulario
          </button>
        </div>
        <p className="employee-help">
          Un servicio realizado y cobrado ahora. Se usa el precio de la sucursal y se calcula la
          comisión del barbero.
        </p>
        {onChooseBranch && (
          <label className="cash-medium">
            Sucursal de la venta
            <select value={branch} onChange={event => onChooseBranch(event.target.value)}>
              <option value="">Elegí una sucursal</option>
              {branches
                .filter(item => item.active)
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {!onChooseBranch && (
          <p>
            Sucursal: <strong>{branchName}</strong>
          </p>
        )}
        {!branch ? (
          <p>Elegí una sucursal para registrar la venta.</p>
        ) : !current ? (
          <p role="status">Cargando servicios y barberos…</p>
        ) : current.error ? (
          <div role="alert">
            <p>{current.error}</p>
            <button className="action-secondary" onClick={() => setRevision(value => value + 1)}>
              Actualizar opciones
            </button>
          </div>
        ) : current.setup ? (
          <>
            <SaleSetupMessage setup={current.setup} admin={!!onChooseBranch} onClose={onCancel} />
            <button className="action-secondary" onClick={() => setRevision(value => value + 1)}>
              Actualizar opciones
            </button>
          </>
        ) : (
          <SaleFields key={key} branch={branch} options={current.options ?? []} onSaved={onSaved} />
        )}
      </section>
    </dialog>
  );
}
