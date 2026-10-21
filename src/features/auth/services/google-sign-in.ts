import { requireSupabaseClient } from '../../../integrations/supabase/client';
import { getAuthRedirectUrl, isNativePlatform } from '../../../shared/native/device-platform';

/** The provider secret stays in Supabase. Google opens outside the native WebView. */
export async function signInWithGoogle(): Promise<void> {
  const native = isNativePlatform();
  const { data, error } = await requireSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl('/cliente'),
      skipBrowserRedirect: native,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) throw new Error('No se pudo abrir Google. Reintentá en unos segundos.');
  if (native) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  }
}
