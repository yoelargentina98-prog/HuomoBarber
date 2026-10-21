import { useEffect, useState } from 'react';
import { loadBranchBalances, type BranchBalance } from './service';
export function useBranchBalances(month: string, revision = 0) {
  const [attempt, setAttempt] = useState(0);
  const key = `${month}/${revision}/${attempt}`;
  const [state, setState] = useState<{ key: string; rows: BranchBalance[]; error: string }>();
  useEffect(() => {
    let active = true;
    loadBranchBalances(month)
      .then(rows => {
        if (active) setState({ key, rows, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            rows: [],
            error: cause instanceof Error ? cause.message : 'No se pudo cargar el balance.',
          });
      });
    return () => {
      active = false;
    };
  }, [month, key]);
  return {
    rows: state?.key === key ? state.rows : [],
    error: state?.key === key ? state.error : '',
    loading: state?.key !== key,
    refresh: () => setAttempt(value => value + 1),
  };
}
