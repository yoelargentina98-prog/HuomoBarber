import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffForm } from '../features/staff/components/StaffForm';
import { createStaff } from '../features/staff/services/staff-service';

vi.mock('../features/staff/services/staff-service', () => ({ createStaff: vi.fn() }));
vi.mock('../features/branches/services/branch-service', () => ({
  listBranches: vi.fn().mockResolvedValue([
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Irigoyen',
      active: true,
      address: '',
      phone: '',
      created_at: '',
      updated_at: '',
    },
  ]),
}));
async function fill() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nombre completo'), 'Juan Pérez');
  await user.type(screen.getByLabelText('Nombre de usuario'), 'juan');
  await user.type(screen.getByLabelText('Contraseña inicial'), 'Una-clave-larga-123');
  await user.selectOptions(
    await screen.findByLabelText('Sucursal'),
    '11111111-1111-4111-8111-111111111111'
  );
  return user;
}
describe('Formulario de personal', () => {
  beforeEach(() => vi.clearAllMocks());
  it('crea una cuenta, notifica al listado y borra la contraseña', async () => {
    const member = {
      id: '1',
      username: 'juan',
      full_name: 'Juan Pérez',
      phone: null,
      role: 'barber' as const,
      created_at: '',
    };
    vi.mocked(createStaff).mockResolvedValue(member);
    const onCreated = vi.fn();
    render(<StaffForm onCreated={onCreated} />);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Crear empleado' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(member));
    expect(screen.getByLabelText('Contraseña inicial')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('creado correctamente');
  });
  it('informa duplicados sin anunciar éxito ni alterar el listado', async () => {
    vi.mocked(createStaff).mockRejectedValue(new Error('Ese nombre de usuario ya existe.'));
    const onCreated = vi.fn();
    render(<StaffForm onCreated={onCreated} />);
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Crear empleado' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya existe');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
