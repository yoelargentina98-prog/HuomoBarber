import { useEffect, useState } from 'react';
import { ClubHistoryPanel } from './ClubHistoryPanel';
import { lookupClient, type ClubClient } from './service';
export function CustomerSelector({
  branch,
  disabled,
  onSelect,
  onNumberChange,
}: {
  branch: string;
  disabled: boolean;
  onSelect: (person: ClubClient | null) => void;
  onNumberChange: (number: string) => void;
}) {
  const [number, setNumber] = useState('');
  const [history, setHistory] = useState(false);
  const [result, setResult] = useState<{ key: string; person?: ClubClient; error?: string }>();
  const key = `${branch}/${number}`;
  useEffect(() => {
    if (!number || disabled) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void lookupClient(number, branch)
        .then(person => {
          if (active) {
            setResult({ key, person });
            onSelect(person);
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setResult({
              key,
              error: cause instanceof Error ? cause.message : 'No se pudo buscar.',
            });
            onSelect(null);
          }
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [number, branch, key, disabled, onSelect]);
  const current = result?.key === key ? result : undefined;
  return (
    <div className="form-wide club-selector">
      <label>
        Número de cliente HuomoClub (opcional)
        <input
          inputMode="numeric"
          pattern="[0-9]{5,15}"
          maxLength={15}
          value={number}
          disabled={disabled}
          placeholder="Teléfono o número de 5 dígitos"
          onChange={event => {
            const value = event.target.value;
            setNumber(value);
            onNumberChange(value);
            onSelect(null);
            setHistory(false);
          }}
        />
      </label>
      {number && !current && <p role="status">Buscando cliente…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.person ? (
        <>
          <p role="status">
            <strong>{current.person.full_name}</strong> · Cliente {current.person.customer_number}
          </p>
          <button type="button" className="text-button" onClick={() => setHistory(value => !value)}>
            {history ? 'Ocultar historial' : 'Ver historial del cliente'}
          </button>
          {history && (
            <ClubHistoryPanel key={current.person.id} client={current.person.id} branch={branch} />
          )}
        </>
      ) : (
        !number && (
          <p className="employee-help">
            Sin número: venta a cliente ocasional, sin historial personal.
          </p>
        )
      )}
    </div>
  );
}
