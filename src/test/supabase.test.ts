import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  requireSupabaseClient,
} from '../integrations/supabase/client';

describe('Supabase Client Integration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('retorna isSupabaseConfigured() = false cuando faltan variables en el entorno', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    expect(isSupabaseConfigured()).toBe(false);
  });

  it('retorna null en getSupabaseClient() cuando no está configurado sin quebrar la aplicación', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const client = getSupabaseClient();
    expect(client).toBeNull();
  });

  it('lanza un error explícito y guiado al invocar requireSupabaseClient() si falta la configuración', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    expect(() => requireSupabaseClient()).toThrow(
      /No se puede inicializar Supabase: configuración incompleta/
    );
  });
});
