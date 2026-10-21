import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthRedirectUrl, getPlatform, isNativePlatform } from '../shared/native/device-platform';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

describe('device-platform utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve false para isNativePlatform en entorno web', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(isNativePlatform()).toBe(false);
  });

  it('devuelve true para isNativePlatform cuando Capacitor corre nativo', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNativePlatform()).toBe(true);
  });

  it('devuelve la plataforma correspondiente', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    expect(getPlatform()).toBe('android');

    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    expect(getPlatform()).toBe('ios');

    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    expect(getPlatform()).toBe('web');
  });

  it('genera URLs web con window.location.origin en entorno web', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const url = getAuthRedirectUrl('/cliente');
    expect(url).toContain('/cliente');
    expect(url.startsWith('http')).toBe(true);
  });

  it('genera esquema huomo:// en entorno nativo para recuperación y confirmación', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    expect(getAuthRedirectUrl('/recuperar')).toBe('huomo://recuperar');
    expect(getAuthRedirectUrl('/cliente')).toBe('huomo://cliente');
    expect(getAuthRedirectUrl('confirmacion')).toBe('huomo://confirmacion');
  });
});
