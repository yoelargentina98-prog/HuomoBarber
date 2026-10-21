import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../shared/native/useNetworkStatus';
import { Network } from '@capacitor/network';
import { isNativePlatform } from '../shared/native/device-platform';

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn(),
    addListener: vi.fn(),
  },
}));

vi.mock('../shared/native/device-platform', () => ({
  isNativePlatform: vi.fn(),
}));

describe('useNetworkStatus hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detecta estado offline en la web mediante eventos de ventana', () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);

    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('utiliza Network de Capacitor cuando corre en contenedor nativo', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    vi.mocked(Network.getStatus).mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    });
    vi.mocked(Network.addListener).mockResolvedValue({
      remove: vi.fn(),
    } as unknown as { remove: () => Promise<void> });

    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      const isConnected = await result.current.checkConnection();
      expect(isConnected).toBe(true);
    });

    expect(Network.getStatus).toHaveBeenCalled();
  });
});
