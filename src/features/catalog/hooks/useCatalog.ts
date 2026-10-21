import { useEffect, useState } from 'react';
import { listCatalog, loadBarberCatalog, type CatalogService } from '../services/catalog-service';

export function useCatalog(employeeId?: string) {
  const [revision, setRevision] = useState(0);
  const key = `${employeeId ?? 'all'}/${revision}`;
  const [state, setState] = useState<{
    key: string;
    catalog: CatalogService[];
    assigned: string[];
    branchId?: string | null;
    branchName?: string | null;
    error: string;
  }>({ key: '', catalog: [], assigned: [], error: '' });
  useEffect(() => {
    let active = true;
    const request = employeeId
      ? loadBarberCatalog(employeeId)
      : listCatalog(true).then(catalog => ({ catalog, assigned: [] as string[] }));
    request
      .then(data => {
        if (active) setState({ key, ...data, error: '' });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            key,
            catalog: [],
            assigned: [],
            error: cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.',
          });
      });
    return () => {
      active = false;
    };
  }, [employeeId, key]);
  return {
    ...state,
    revision,
    loading: state.key !== key,
    refresh: () => setRevision(previous => previous + 1),
  };
}
