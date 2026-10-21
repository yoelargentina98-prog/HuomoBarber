import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeAccess } from '../features/auth/components/WelcomeAccess';
import { signInUnified } from '../features/staff/services/admin-session';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../features/staff/services/admin-session', () => ({
  signInUnified: vi.fn(),
  signUpClient: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

describe('Acceso unificado para los 4 roles (WelcomeAccess)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no contiene ningún selector ni combobox de roles en el formulario', () => {
    render(<WelcomeAccess />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/elegí tu rol/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/usuario o email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña/i)).toBeInTheDocument();
  });

  it('redirige a /cliente cuando la cuenta autenticada es un cliente', async () => {
    vi.mocked(signInUnified).mockResolvedValueOnce('client');
    const user = userEvent.setup();

    render(<WelcomeAccess />);

    await user.type(screen.getByPlaceholderText(/usuario o email/i), 'cliente@ejemplo.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secreto123');
    await user.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    await waitFor(() => {
      expect(signInUnified).toHaveBeenCalledWith('cliente@ejemplo.com', 'secreto123');
      expect(mockNavigate).toHaveBeenCalledWith('/cliente', { replace: true });
    });
  });

  it('redirige a /admin cuando la cuenta autenticada es un administrador', async () => {
    vi.mocked(signInUnified).mockResolvedValueOnce('admin');
    const user = userEvent.setup();

    render(<WelcomeAccess />);

    await user.type(screen.getByPlaceholderText(/usuario o email/i), 'admin');
    await user.type(screen.getByPlaceholderText('••••••••'), 'AdminPass2026');
    await user.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    await waitFor(() => {
      expect(signInUnified).toHaveBeenCalledWith('admin', 'AdminPass2026');
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('redirige a /recepcion cuando la cuenta autenticada es recepcionista', async () => {
    vi.mocked(signInUnified).mockResolvedValueOnce('reception');
    const user = userEvent.setup();

    render(<WelcomeAccess />);

    await user.type(screen.getByPlaceholderText(/usuario o email/i), 'recep.centro');
    await user.type(screen.getByPlaceholderText('••••••••'), 'claveCentro');
    await user.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/recepcion', { replace: true });
    });
  });

  it('redirige a /barbero cuando la cuenta autenticada es un barbero', async () => {
    vi.mocked(signInUnified).mockResolvedValueOnce('barber');
    const user = userEvent.setup();

    render(<WelcomeAccess />);

    await user.type(screen.getByPlaceholderText(/usuario o email/i), 'franco.corte');
    await user.type(screen.getByPlaceholderText('••••••••'), 'claveFranco');
    await user.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/barbero', { replace: true });
    });
  });

  it('muestra un mensaje de error comprensible si las credenciales fallan', async () => {
    vi.mocked(signInUnified).mockRejectedValueOnce(new Error('Credenciales incorrectas'));
    const user = userEvent.setup();

    render(<WelcomeAccess />);

    await user.type(screen.getByPlaceholderText(/usuario o email/i), 'usuario@error.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'erronea');
    await user.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
