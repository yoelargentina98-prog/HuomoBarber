import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateEnvironment } from '../shared/lib/env';

describe('validateEnvironment', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('detecta cuando faltan las variables de entorno de Supabase sin lanzar excepciones', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const result = validateEnvironment();

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some(e => e.includes('VITE_SUPABASE_URL'))).toBe(true);
    expect(result.errors.some(e => e.includes('VITE_SUPABASE_ANON_KEY'))).toBe(true);
  });

  it('valida exitosamente cuando las variables son correctas', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto-demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key');

    const result = validateEnvironment();

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.supabaseUrl).toBe('https://proyecto-demo.supabase.co');
  });

  it('alerta si se detecta una clave potencialmente service_role en el frontend', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto-demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'service_role_secret_key_prohibida');

    const result = validateEnvironment();

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('service_role'))).toBe(true);
  });
});
