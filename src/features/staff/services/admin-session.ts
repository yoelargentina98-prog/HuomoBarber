import { requireSupabaseClient } from '../../../integrations/supabase/client';
import { loginEmail } from './login-identity';
import { cashOperator } from '../../cash/sales/service';

export async function hasAdminSession(): Promise<boolean> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return false;
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (error) throw new Error('No se pudo verificar el perfil. Revisá la migración de roles.');
  return data?.role === 'admin';
}

export async function signInAdmin(
  identity: string,
  password: string
): Promise<'admin' | 'reception' | 'barber'> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signInWithPassword({ email: loginEmail(identity), password });
  if (error) throw new Error('No se pudo ingresar. Revisá el usuario o email y la contraseña.');
  try {
    if (await hasAdminSession()) return 'admin';
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error('No se pudo verificar la sesión.');
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError) throw new Error('No se pudo verificar el perfil.');
    if (profile.role === 'barber') {
      const { error } = await client.rpc('get_barber_portal');
      if (error) throw new Error(error.message);
      return 'barber';
    }
    const operator = await cashOperator();
    if (operator?.role === 'reception') return 'reception';
    throw new Error('Esta cuenta no tiene acceso a administración o recepción.');
  } catch (cause) {
    await client.auth.signOut();
    throw cause;
  }
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión.');
}

export function onSessionChange(callback: () => void): () => void {
  const { data } = requireSupabaseClient().auth.onAuthStateChange(() => {
    // Evitar consultas a Auth dentro de su callback síncrono.
    queueMicrotask(callback);
  });
  return () => data.subscription.unsubscribe();
}
