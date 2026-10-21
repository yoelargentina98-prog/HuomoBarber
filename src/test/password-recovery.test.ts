import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasRecoverySession,
  saveRecoveredPassword,
} from '../features/auth/services/password-recovery';
import { requireSupabaseClient } from '../integrations/supabase/client';
vi.mock('../integrations/supabase/client', () => ({ requireSupabaseClient: vi.fn() }));
const auth = { getSession: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSupabaseClient).mockReturnValue({ auth } as unknown as ReturnType<
    typeof requireSupabaseClient
  >);
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'test' } } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});
describe('Recuperación de contraseña', () => {
  it('rechaza contraseñas distintas sin modificar la cuenta', async () => {
    await expect(saveRecoveredPassword('abcdef', 'abcdeg')).rejects.toThrow('no coinciden');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('rechaza enlaces sin sesión', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await hasRecoverySession()).toBe(false);
    await expect(saveRecoveredPassword('abcdef', 'abcdef')).rejects.toThrow('venció');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('actualiza la contraseña y cierra la sesión de recuperación', async () => {
    await saveRecoveredPassword('abcdef', 'abcdef');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'abcdef' });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
  it('conserva el error del servidor sin anunciar éxito', async () => {
    auth.updateUser.mockResolvedValue({ error: { message: 'Enlace inválido' } });
    await expect(saveRecoveredPassword('abcdef', 'abcdef')).rejects.toThrow('Enlace inválido');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
