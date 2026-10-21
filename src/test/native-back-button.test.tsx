import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useBackButton } from '../shared/native/useBackButton';
import { modalStack } from '../shared/native/modal-stack';
import { App } from '@capacitor/app';
import { isNativePlatform } from '../shared/native/device-platform';

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/cliente/turnos' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

vi.mock('../shared/native/device-platform', () => ({
  isNativePlatform: vi.fn(),
}));

function TestBackComponent() {
  useBackButton();
  return <div>Componente con botón Atrás</div>;
}

describe('useBackButton hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    while (modalStack.popAndClose()) {
      /* limpiar pila */
    }
  });

  it('no registra listener si no está en plataforma nativa', () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);
    render(<TestBackComponent />);
    expect(App.addListener).not.toHaveBeenCalled();
  });

  it('registra el listener en plataforma nativa y prioriza cerrar modal abierto', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    let capturedCallback: ((data: { canGoBack: boolean }) => void) | null = null;

    vi.mocked(App.addListener).mockImplementation(
      (_event: string, callback: (data: { canGoBack: boolean }) => void) => {
        capturedCallback = callback;
        return Promise.resolve({ remove: vi.fn() } as unknown as { remove: () => Promise<void> });
      }
    );

    render(<TestBackComponent />);

    expect(App.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));

    const closeModal = vi.fn();
    modalStack.push(closeModal);

    // Disparamos el evento nativo del botón atrás
    expect(capturedCallback).not.toBeNull();
    capturedCallback!({ canGoBack: true });

    // El modal debe haberse cerrado
    expect(closeModal).toHaveBeenCalledTimes(1);
    // Y no debe haber navegado hacia atrás porque el modal absorbió el toque
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navega hacia atrás si no hay modales abiertos y no está en la raíz', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    let capturedCallback: ((data: { canGoBack: boolean }) => void) | null = null;

    vi.mocked(App.addListener).mockImplementation(
      (_event: string, callback: (data: { canGoBack: boolean }) => void) => {
        capturedCallback = callback;
        return Promise.resolve({ remove: vi.fn() } as unknown as { remove: () => Promise<void> });
      }
    );

    mockLocation.pathname = '/cliente/turnos';
    render(<TestBackComponent />);

    expect(capturedCallback).not.toBeNull();
    capturedCallback!({ canGoBack: true });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('cierra la app con exitApp si está en la raíz sin bucles', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    let capturedCallback: ((data: { canGoBack: boolean }) => void) | null = null;

    vi.mocked(App.addListener).mockImplementation(
      (_event: string, callback: (data: { canGoBack: boolean }) => void) => {
        capturedCallback = callback;
        return Promise.resolve({ remove: vi.fn() } as unknown as { remove: () => Promise<void> });
      }
    );

    mockLocation.pathname = '/';
    render(<TestBackComponent />);

    expect(capturedCallback).not.toBeNull();
    capturedCallback!({ canGoBack: false });

    expect(App.exitApp).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
