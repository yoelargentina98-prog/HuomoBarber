import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeAccess } from '../features/auth/components/WelcomeAccess';
import { signUpClient, requestPasswordReset } from '../features/staff/services/admin-session';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../features/staff/services/admin-session', () => ({
  signInUnified: vi.fn(),
  signUpClient: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

describe('Registro público de clientes y recuperación (WelcomeAccess)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite alternar a la pestaña de registro y no ofrece selector de roles', async () => {
    const user = userEvent.setup();
    render(<WelcomeAccess />);

    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre y apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono de contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    // Exclusivamente para clientes: no existe selector de roles
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/rol/i)).not.toBeInTheDocument();
  });

  it('rechaza contraseñas menores a 6 caracteres', async () => {
    const user = userEvent.setup();
    render(<WelcomeAccess />);

    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));

    await user.type(screen.getByLabelText(/nombre y apellido/i), 'Juan Pérez');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'juan@ejemplo.com');
    await user.type(screen.getByLabelText(/teléfono de contacto/i), '1122334455');
    await user.type(screen.getByLabelText(/^contraseña/i), '12345');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), '12345');

    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 6 caracteres.'
    );
    expect(signUpClient).not.toHaveBeenCalled();
  });

  it('rechaza si las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    render(<WelcomeAccess />);

    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));

    await user.type(screen.getByLabelText(/nombre y apellido/i), 'Juan Pérez');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'juan@ejemplo.com');
    await user.type(screen.getByLabelText(/teléfono de contacto/i), '1122334455');
    await user.type(screen.getByLabelText(/^contraseña/i), 'passwordA1');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'passwordB2');

    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las contraseñas no coinciden. Verificalas antes de continuar.'
    );
    expect(signUpClient).not.toHaveBeenCalled();
  });

  it('registra al cliente con éxito y muestra confirmación de correo', async () => {
    vi.mocked(signUpClient).mockResolvedValueOnce({
      requiresEmailConfirmation: true,
      user: null,
    });
    const user = userEvent.setup();
    render(<WelcomeAccess />);

    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));

    await user.type(screen.getByLabelText(/nombre y apellido/i), 'Lucas Romero');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'lucas@correo.com');
    await user.type(screen.getByLabelText(/teléfono de contacto/i), '+54 11 5555-1234');
    await user.type(screen.getByLabelText(/^contraseña/i), 'LucasSegura123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'LucasSegura123');

    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));

    await waitFor(() => {
      expect(signUpClient).toHaveBeenCalledWith({
        fullName: 'Lucas Romero',
        email: 'lucas@correo.com',
        phone: '+54 11 5555-1234',
        password: 'LucasSegura123',
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        '¡Cuenta creada con éxito! Te enviamos un correo de confirmación'
      );
    });
  });

  it('permite solicitar la recuperación de contraseña por correo', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValueOnce();
    const user = userEvent.setup();
    render(<WelcomeAccess />);

    await user.click(screen.getByRole('button', { name: /¿olvidaste tu contraseña?/i }));
    expect(screen.getByRole('heading', { name: /recuperar contraseña/i })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('tunombre@email.com'), 'olvido@ejemplo.com');
    await user.click(screen.getByRole('button', { name: /enviar enlace de recuperación/i }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('olvido@ejemplo.com');
      expect(screen.getByRole('status')).toHaveTextContent(
        'Te enviamos un correo con las instrucciones para restablecer tu contraseña'
      );
    });
  });
});
