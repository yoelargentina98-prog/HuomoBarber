import { useEffect, useState } from 'react';
import { loadCashDay } from './service';
import type { CashDay } from './model';
export function useCashDay(day: string, branch: string) {
  const [revision, setRevision] = useState(0);
  const key = `${day}/${branch}/${revision}`;
  const [state, setState] = useState<{ key: string; data?: CashDay; error?: string }>();
  useEffect(() => {
    let active = true;
    loadCashDay(day, branch)
      .then(data => {
        if (active) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            error: cause instanceof Error ? cause.message : 'No se pudo cargar Caja.',
          });
      });
    return () => {
      active = false;
    };
  }, [day, branch, key]);
  return {
    data: state?.key === key ? state.data : undefined,
    error: state?.key === key ? state.error : undefined,
    loading: state?.key !== key,
    revision,
    refresh: () => setRevision(value => value + 1),
  };
}
