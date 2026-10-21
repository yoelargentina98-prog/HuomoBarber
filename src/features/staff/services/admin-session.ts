import { requireSupabaseClient } from '../../../integrations/supabase/client';
import { loginEmail } from './login-identity';
import { cashOperator } from '../../cash/sales/service';
import type { AppRole, ClientProfile } from '../../appointments/model/types';
import { getAuthRedirectUrl } from '../../../shared/native/device-platform';

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

export async function signInUnified(identity: string, password: string): Promise<AppRole> {
  const client = requireSupabaseClient();
  const normalizedEmail = loginEmail(identity);
  const { error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) throw new Error('No se pudo ingresar. Revisá el usuario o email y la contraseña.');

  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error('No se pudo verificar la sesión iniciada.');

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role, full_name, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo verificar el perfil de tu cuenta. Reintentá.');
    }

    if (profile.role === 'admin') return 'admin';
    if (profile.role === 'barber') {
      const { error } = await client.rpc('get_barber_portal');
      if (error) throw new Error(error.message);
      return 'barber';
    }
    if (profile.role === 'reception') {
      const operator = await cashOperator();
      if (operator?.role === 'reception') return 'reception';
      throw new Error('Esta cuenta no tiene asignada una sucursal activa.');
    }
    if (profile.role === 'client') {
      return 'client';
    }

    throw new Error('La cuenta no tiene un rol habilitado.');
  } catch (cause) {
    await client.auth.signOut();
    throw cause;
  }
}

/** Retrocompatibilidad para llamadas existentes en portales de administración */
export const signInAdmin = signInUnified;

export async function signUpClient(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ user: { id: string; email?: string } | null; requiresEmailConfirmation: boolean }> {
  const client = requireSupabaseClient();
  const fullName = params.fullName.trim();
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim();
  const password = params.password;

  if (fullName.length < 2) {
    throw new Error('Ingresá tu nombre y apellido completo.');
  }
  if (!email.includes('@') || email.length < 5) {
    throw new Error('Ingresá un correo electrónico válido.');
  }
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl('/cliente'),
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('duplicate')
    ) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }
    throw new Error(error.message || 'No se pudo crear la cuenta.');
  }

  const requiresEmailConfirmation = !data.session;
  return { user: data.user, requiresEmailConfirmation };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = requireSupabaseClient();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('Ingresá un correo electrónico válido.');
  }
  const { error } = await client.auth.resetPasswordForEmail(normalized, {
    redirectTo: getAuthRedirectUrl('/recuperar'),
  });
  if (error) {
    throw new Error('No se pudo enviar el enlace de recuperación. Intentá nuevamente.');
  }
}

export async function getCurrentUserProfile(): Promise<ClientProfile | null> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, role, full_name, phone, customer_number')
    .eq('id', session.user.id)
    .single();

  if (error || !data) {
    throw new Error('No se pudo cargar tu perfil. Reintentá.');
  }

  return {
    id: data.id,
    email: session.user.email ?? '',
    fullName: data.full_name ?? '',
    phone: data.phone ?? '',
    customerNumber: data.customer_number,
    role: data.role ?? 'client',
  };
}

export async function updateClientProfile(fields: {
  fullName: string;
  phone: string;
}): Promise<void> {
  const client = requireSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const fullName = fields.fullName.trim();
  const phone = fields.phone.trim();

  if (fullName.length < 2) {
    throw new Error('Ingresá un nombre válido.');
  }

  const { error } = await client
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', user.id);

  if (error) {
    throw new Error('No se pudieron guardar los cambios en tu perfil.');
  }
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión.');
}

export function onSessionChange(callback: () => void): () => void {
  const { data } = requireSupabaseClient().auth.onAuthStateChange(() => {
    queueMicrotask(callback);
  });
  return () => data.subscription.unsubscribe();
}
