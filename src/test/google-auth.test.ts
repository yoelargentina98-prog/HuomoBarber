import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithGoogle } from '../features/auth/services/google-sign-in';
import { acceptNativeAuthUrl } from '../features/auth/services/native-auth-callback';
const mocks = vi.hoisted(() => ({
  oauth: vi.fn(),
  exchange: vi.fn(),
  session: vi.fn(),
  open: vi.fn(),
  native: vi.fn(),
}));
vi.mock('../integrations/supabase/client', () => ({
  requireSupabaseClient: () => ({
    auth: {
      signInWithOAuth: mocks.oauth,
      exchangeCodeForSession: mocks.exchange,
      setSession: mocks.session,
    },
  }),
}));
vi.mock('../shared/native/device-platform', () => ({
  isNativePlatform: mocks.native,
  getAuthRedirectUrl: (path: string) =>
    mocks.native() ? `huomo:/${path}` : `http://localhost:5173${path}`,
}));
vi.mock('@capacitor/browser', () => ({ Browser: { open: mocks.open } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.native.mockReturnValue(false);
  mocks.oauth.mockResolvedValue({ data: { url: 'https://accounts.google.com/test' }, error: null });
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.session.mockResolvedValue({ error: null });
});
describe('Google OAuth', () => {
  it('uses the existing web callback and never includes a client secret', async () => {
    await signInWithGoogle();
    expect(mocks.oauth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/cliente',
        skipBrowserRedirect: false,
        queryParams: { prompt: 'select_account' },
      },
    });
    expect(mocks.open).not.toHaveBeenCalled();
  });
  it('opens native auth in the system browser', async () => {
    mocks.native.mockReturnValue(true);
    await signInWithGoogle();
    expect(mocks.oauth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: 'huomo://cliente',
          skipBrowserRedirect: true,
        }),
      })
    );
    expect(mocks.open).toHaveBeenCalledWith({ url: 'https://accounts.google.com/test' });
  });
  it('does not open a browser after a provider error', async () => {
    mocks.oauth.mockResolvedValue({ data: { url: null }, error: { message: 'disabled' } });
    await expect(signInWithGoogle()).rejects.toThrow('No se pudo abrir');
    expect(mocks.open).not.toHaveBeenCalled();
  });
});
describe('Native auth callbacks', () => {
  it('exchanges a PKCE code before navigating', async () => {
    expect(await acceptNativeAuthUrl('huomo://cliente?code=test-code')).toBe('/cliente');
    expect(mocks.exchange).toHaveBeenCalledWith('test-code');
  });
  it('keeps older recovery links usable', async () => {
    expect(
      await acceptNativeAuthUrl('huomo://recuperar#access_token=access&refresh_token=refresh')
    ).toBe('/recuperar');
    expect(mocks.session).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });
  it('rejects failed code exchange', async () => {
    mocks.exchange.mockResolvedValue({ error: { message: 'invalid' } });
    await expect(acceptNativeAuthUrl('huomo://cliente?code=invalid')).rejects.toThrow(
      'No se pudo validar'
    );
  });
  it('handles cancellation without exposing provider details', async () => {
    await expect(acceptNativeAuthUrl('huomo://cliente?error=access_denied')).rejects.toThrow(
      'cancelado'
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it('ignores unrecognized destinations and incomplete links', async () => {
    expect(await acceptNativeAuthUrl('https://untrusted.example/cliente?code=abc')).toBeNull();
    expect(await acceptNativeAuthUrl('huomo://admin?code=abc')).toBeNull();
    await expect(acceptNativeAuthUrl('huomo://cliente')).rejects.toThrow('incompleto');
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
