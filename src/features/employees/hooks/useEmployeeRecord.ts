import { useEffect, useState } from 'react';
import { loadEmployee } from '../services/employee-read';
import type { EmployeeRecord } from '../model/types';

export function useEmployeeRecord(id: string, month: string) {
  const key = `${id}/${month}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key: string;
    revision: number;
    record: EmployeeRecord | null;
    error: string;
  }>({ key, revision: -1, record: null, error: '' });
  useEffect(() => {
    let active = true;
    loadEmployee(id, month)
      .then(record => {
        if (active) setState({ key, revision, record, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState(previous => ({
            key,
            revision,
            record: previous.key === key ? previous.record : null,
            error: cause instanceof Error ? cause.message : 'No se pudo cargar la ficha.',
          }));
      });
    return () => {
      active = false;
    };
  }, [id, month, key, revision]);
  return {
    record: state.key === key ? state.record : null,
    loading: state.key !== key || state.revision !== revision,
    error: state.key === key && state.revision === revision ? state.error : '',
    refresh: () => setRevision(previous => previous + 1),
  };
}
