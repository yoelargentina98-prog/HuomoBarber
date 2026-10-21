/**
 * Cliente centralizado de Supabase para Huomo.
 *
 * ARQUITECTURA:
 * - Los componentes de interfaz de usuario NUNCA deben invocar este cliente directamente.
 * - Toda interacción con datos debe transitar a través de servicios o repositorios en `features/`
 *   o `shared/lib/` para asegurar desacoplamiento y facilitar pruebas unitarias.
 * - Si faltan las variables de entorno, la aplicación inicia normalmente y reporta
 *   el estado no configurado en los puntos de integración que lo requieran.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateEnvironment } from '../../shared/lib/env';
import type { Database } from './types';

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Retorna true si Supabase cuenta con credenciales válidas en las variables de entorno.
 */
export function isSupabaseConfigured(): boolean {
  const env = validateEnvironment();
  return env.isValid;
}

/**
 * Retorna el cliente de Supabase tipado si el entorno está configurado,
 * o null si aún no se han configurado las credenciales del proyecto.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient) {
    return cachedClient;
  }

  const env = validateEnvironment();

  if (!env.isValid || !env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  cachedClient = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return cachedClient;
}

/**
 * Obtiene el cliente o lanza un error descriptivo si una operación obligatoria
 * requiere conectividad con Supabase.
 */
export function requireSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient();
  if (!client) {
    const env = validateEnvironment();
    const details = env.errors.join(' | ');
    throw new Error(
      `No se puede inicializar Supabase: configuración incompleta. Detalle: ${details || 'Faltan variables de entorno'}. Revise el archivo .env.local según .env.example.`
    );
  }
  return client;
}
