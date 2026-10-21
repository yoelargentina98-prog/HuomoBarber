import { useEffect, useState, type ReactNode } from 'react';
import { loadStaffCounts, listStaff, type StaffMember } from '../services/staff-service';
import { StaffContext } from '../hooks/staff-context';

/** Un error de datos nunca modifica ni invalida la sesión del administrador. */
export function StaffProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<{ barber: number; reception: number }>();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([listStaff(), loadStaffCounts()])
      .then(([data, totals]) => {
        if (active) {
          setMembers(data);
          setCounts(totals);
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el equipo.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <StaffContext
      value={{
        members,
        counts,
        paginated: true,
        revision,
        loading,
        error,
        refresh: () => {
          setLoading(true);
          setRevision(previous => previous + 1);
        },
        addMember: () => {
          setLoading(true);
          setRevision(previous => previous + 1);
        },
      }}
    >
      {children}
    </StaffContext>
  );
}
