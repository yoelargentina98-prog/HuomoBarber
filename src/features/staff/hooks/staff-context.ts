import { createContext, useContext } from 'react';
import type { StaffMember } from '../services/staff-service';

interface StaffData {
  counts?: { barber: number; reception: number };
  paginated?: boolean;
  revision?: number;
  members: StaffMember[];
  loading: boolean;
  error: string;
  refresh: () => void;
  addMember: (member: StaffMember) => void;
}
export const StaffContext = createContext<StaffData | null>(null);
export function useStaffData() {
  const context = useContext(StaffContext);
  if (!context) throw new Error('La gestión de personal requiere StaffProvider.');
  return context;
}
