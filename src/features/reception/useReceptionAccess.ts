import { useEffect, useState } from 'react';
import { cashOperator, type CashOperator } from '../cash/sales/service';
import { onSessionChange } from '../staff/services/admin-session';
export function useReceptionAccess() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    revision: number;
    operator?: CashOperator | null;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function check() {
      const request = ++generation;
      try {
        const operator = await cashOperator();
        if (active && request === generation) setState({ revision, operator });
      } catch (cause) {
        if (active && request === generation)
          setState({
            revision,
            error: cause instanceof Error ? cause.message : 'No se pudo verificar el acceso.',
          });
      }
    }
    void check();
    let unsubscribe = () => {};
    try {
      unsubscribe = onSessionChange(() => {
        if (active) void check();
      });
    } catch {
      /* check reports errors */
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [revision]);
  return {
    ...state,
    loading: state?.revision !== revision,
    retry: () => setRevision(value => value + 1),
  };
}
