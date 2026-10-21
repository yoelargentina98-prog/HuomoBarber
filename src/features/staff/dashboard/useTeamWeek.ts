import { useEffect, useState } from 'react';
import { loadTeamWeek } from './service';
import type { WeeklyBarber } from './model';
export function useTeamWeek(start: string, branchId: string) {
  const [revision, setRevision] = useState(0);
  const key = `${start}/${branchId}/${revision}`;
  const [state, setState] = useState<{ key: string; rows: WeeklyBarber[]; error: string }>();
  useEffect(() => {
    let active = true;
    loadTeamWeek(start, branchId)
      .then(rows => {
        if (active) setState({ key, rows, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            rows: [],
            error: cause instanceof Error ? cause.message : 'No se pudo cargar el resumen.',
          });
      });
    return () => {
      active = false;
    };
  }, [start, branchId, key]);
  return {
    rows: state?.key === key ? state.rows : [],
    error: state?.key === key ? state.error : '',
    loading: state?.key !== key,
    refresh: () => setRevision(value => value + 1),
  };
}
