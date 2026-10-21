import { useEffect, useState } from 'react';
import { loadReceptionTeamCount, loadReceptionTeam, type ReceptionEmployee } from './service';
export function useReceptionTeam(branch: string) {
  const [revision, setRevision] = useState(0);
  const key = `${branch}/${revision}`;
  const [state, setState] = useState<{
    key: string;
    team: ReceptionEmployee[];
    activeBarbers?: number;
    error: string;
  }>();
  useEffect(() => {
    let active = true;
    if (branch)
      Promise.all([loadReceptionTeam(branch), loadReceptionTeamCount(branch)])
        .then(([team, activeBarbers]) => {
          if (active) setState({ key, team, activeBarbers, error: '' });
        })
        .catch((cause: unknown) => {
          if (active)
            setState({
              key,
              team: [],
              error: cause instanceof Error ? cause.message : 'No se pudo cargar el equipo.',
            });
        });
    return () => {
      active = false;
    };
  }, [branch, key]);
  return {
    activeBarbers: state?.key === key ? state.activeBarbers : undefined,
    revision,
    team: state?.key === key ? state.team : [],
    error: state?.key === key ? state.error : '',
    loading: !!branch && state?.key !== key,
    refresh: () => setRevision(value => value + 1),
  };
}
