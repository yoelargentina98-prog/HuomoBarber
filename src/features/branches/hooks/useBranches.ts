import { useEffect, useState } from 'react';
import { listBranches, type Branch } from '../services/branch-service';
export function useBranches() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ revision: number; branches: Branch[]; error: string }>({
    revision: -1,
    branches: [],
    error: '',
  });
  useEffect(() => {
    let active = true;
    listBranches()
      .then(branches => {
        if (active) setState({ revision, branches, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            revision,
            branches: [],
            error: cause instanceof Error ? cause.message : 'No se pudieron cargar las sucursales.',
          });
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return {
    ...state,
    loading: state.revision !== revision,
    refresh: () => setRevision(value => value + 1),
  };
}
