import { requireSupabaseClient } from '../../../integrations/supabase/client';

export async function hasRecoverySession(): Promise<boolean> {
  const { data, error } = await requireSupabaseClient().auth.getSession();
  if (error) throw new Error('No se pudo verificar el enlace. Volvé a solicitarlo.');
  return !!data.session;
}
export async function saveRecoveredPassword(password: string, confirmation: string): Promise<void> {
  if (password.length < 6 || password.length > 128)
    throw new Error('La contraseña debe tener entre 6 y 128 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  if (!(await hasRecoverySession())) throw new Error('El enlace venció. Solicitá uno nuevo.');
  const { error } = await requireSupabaseClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
  // Finish recovery with a fresh explicit login, rather than keeping a reset session open.
  const result = await requireSupabaseClient().auth.signOut();
  if (result.error)
    throw new Error('La contraseña cambió. Cerrá esta sesión antes de volver a ingresar.');
}
