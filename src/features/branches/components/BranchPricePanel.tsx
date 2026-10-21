import { Paginated } from '../../../shared/components/Paginated';
import { useEffect, useState } from 'react';
import {
  listBranches,
  loadBranchPrices,
  saveBranchPrices,
  type Branch,
  type BranchPrice,
} from '../services/branch-service';
import { SaveForm } from '../../../shared/components/SaveForm';
import { moneyInput, parseMoney } from '../../employees/model/money';
export function BranchPricePanel({
  serviceId,
  serviceName,
  onSaved,
  onCancel,
}: {
  serviceId: string;
  serviceName: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<{
    branches: Branch[];
    prices: BranchPrice[];
    loading: boolean;
    error: string;
  }>({ branches: [], prices: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    Promise.all([listBranches(), loadBranchPrices(serviceId)])
      .then(([branches, prices]) => {
        if (active) setState({ branches, prices, loading: false, error: '' });
      })
      .catch(() => {
        if (active)
          setState({
            branches: [],
            prices: [],
            loading: false,
            error: 'No se pudieron cargar las tarifas por sucursal.',
          });
      });
    return () => {
      active = false;
    };
  }, [serviceId]);
  const [drafts, setDrafts] = useState<Record<string, { active: boolean; raw: string }>>({});
  function values(id: string) {
    const price = state.prices.find(item => item.branch_id === id);
    return (
      drafts[id] ?? {
        active: price?.active ?? false,
        raw: price?.price_cents != null ? moneyInput(price.price_cents) : '',
      }
    );
  }
  const available = state.branches.filter(branch => branch.active);
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TARIFAS POR UBICACIÓN</span>
          <h2>{serviceName}</h2>
        </div>
        <button className="text-button" onClick={onCancel}>
          Cerrar precios
        </button>
      </div>
      <p className="employee-help">
        Indicá en qué sucursales se ofrece y su precio en cada una. Sin precio configurado no se
        habilita para los barberos.
      </p>
      {state.loading ? (
        <p role="status">Cargando sucursales y precios…</p>
      ) : state.error ? (
        <p role="alert" className="inline-error">
          {state.error}
        </p>
      ) : !available.length ? (
        <p>No hay sucursales activas. Creá una en Sucursales.</p>
      ) : (
        <SaveForm
          label="Guardar precios por sucursal"
          onSaved={onSaved}
          save={() =>
            saveBranchPrices(
              serviceId,
              available.map(branch => {
                const { active, raw } = values(branch.id);
                if (active && !raw) throw new Error(`Ingresá el precio de ${branch.name}.`);
                return { branch_id: branch.id, active, price_cents: raw ? parseMoney(raw) : null };
              })
            )
          }
        >
          <Paginated items={available}>
            {pageRows => (
              <div className="form-wide">
                {pageRows.map(branch => {
                  const price = values(branch.id);
                  return (
                    <div key={branch.id} className="branch-price-row form-wide">
                      <label className="branch-available">
                        <input
                          name={`active_${branch.id}`}
                          type="checkbox"
                          checked={price.active}
                          onChange={event =>
                            setDrafts(previous => ({
                              ...previous,
                              [branch.id]: { ...price, active: event.target.checked },
                            }))
                          }
                        />
                        <span>Disponible en {branch.name}</span>
                      </label>
                      <label>
                        Precio en {branch.name} (ARS)
                        <input
                          name={`price_${branch.id}`}
                          inputMode="decimal"
                          value={price.raw}
                          onChange={event =>
                            setDrafts(previous => ({
                              ...previous,
                              [branch.id]: { ...price, raw: event.target.value },
                            }))
                          }
                          placeholder="Sin configurar"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </Paginated>
        </SaveForm>
      )}
    </section>
  );
}
