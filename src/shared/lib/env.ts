/**
 * Validador e inspector de variables de entorno de Vite.
 *
 * En Sprint 0, la aplicación permite inicializarse incluso si las variables
 * de Supabase aún no fueron provistas en .env.local, informando el estado
 * claramente al desarrollador y al usuario en lugar de romper en pantalla blanca.
 */

export interface EnvValidationResult {
  isValid: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  errors: string[];
  warnings: string[];
}

/**
 * Valida el formato y presencia de las variables de entorno de Supabase.
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const supabaseUrl = typeof rawUrl === 'string' && rawUrl.trim() !== '' ? rawUrl.trim() : null;
  const supabaseAnonKey =
    typeof rawAnonKey === 'string' && rawAnonKey.trim() !== '' ? rawAnonKey.trim() : null;

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL no está definida en las variables de entorno.');
  } else {
    try {
      const parsedUrl = new URL(supabaseUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push(
          `VITE_SUPABASE_URL tiene un protocolo no válido: "${parsedUrl.protocol}". Debe ser http o https.`
        );
      }
    } catch {
      errors.push(`VITE_SUPABASE_URL no es una URL válida: "${supabaseUrl}".`);
    }
  }

  if (!supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY no está definida en las variables de entorno.');
  } else if (supabaseAnonKey.startsWith('sb_secret') || supabaseAnonKey.includes('service_role')) {
    // Alerta de seguridad preventiva: nunca debe usarse service_role en el cliente
    errors.push(
      'ALERTA DE SEGURIDAD CRÍTICA: Se detectó una clave que parece ser service_role en VITE_SUPABASE_ANON_KEY. Solo debe utilizarse la clave pública anon.'
    );
  }

  // Comprobar variables prohibidas que nunca deben existir en frontend
  const envObj = (import.meta.env || {}) as Record<string, unknown>;
  for (const key of Object.keys(envObj)) {
    if (key.toLowerCase().includes('service_role') || key.toLowerCase().includes('secret_key')) {
      errors.push(`Variable peligrosa expuesta en cliente: "${key}". Remuévala de inmediato.`);
    }
  }

  const isValid = errors.length === 0 && supabaseUrl !== null && supabaseAnonKey !== null;

  return {
    isValid,
    supabaseUrl,
    supabaseAnonKey,
    errors,
    warnings,
  };
}

export const envStatus = validateEnvironment();
