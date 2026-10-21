import { useMemo } from 'react';
import { validateEnvironment, type EnvValidationResult } from '../lib/env';

export interface SupabaseStatusHookResult {
  isConfigured: boolean;
  validation: EnvValidationResult;
}

/**
 * Hook para consultar el estado de la configuración de Supabase
 * de forma reactiva y segura en componentes visuales.
 */
export function useSupabaseStatus(): SupabaseStatusHookResult {
  return useMemo(() => {
    const validation = validateEnvironment();
    return {
      isConfigured: validation.isValid,
      validation,
    };
  }, []);
}
