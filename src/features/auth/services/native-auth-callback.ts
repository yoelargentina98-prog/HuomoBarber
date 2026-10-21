import { requireSupabaseClient } from '../../../integrations/supabase/client';

/** Accept only the two explicitly configured native auth destinations. */
export async function acceptNativeAuthUrl(raw: string): Promise<'/cliente' | '/recuperar' | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!['huomo:', 'com.huomo.barber:'].includes(url.protocol)) return null;
  const route = `/${url.hostname}${url.pathname}`.replace(/\/$/, '');
  if (route !== '/cliente' && route !== '/recuperar') return null;
  const params = new URLSearchParams(url.search);
  new URLSearchParams(url.hash.slice(1)).forEach((value, key) => params.set(key, value));
  if (params.has('error') || params.has('error_description')) {
    throw new Error('El acceso fue cancelado o el enlace venció. Volvé a intentarlo.');
  }
  const auth = requireSupabaseClient().auth;
  const code = params.get('code');
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);
    if (error) throw new Error('No se pudo validar el acceso. Volvé a intentarlo.');
  } else if (access && refresh) {
    // Compatibility with email links issued before the move to PKCE.
    const { error } = await auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) throw new Error('El enlace venció o no es válido. Solicitá uno nuevo.');
  } else {
    throw new Error('El enlace de acceso está incompleto. Volvé a intentarlo.');
  }
  return route;
}
