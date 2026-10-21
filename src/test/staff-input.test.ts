import { describe, expect, it } from 'vitest';
import { parseStaffInput } from '../../supabase/functions/_shared/staff-input';

const valid = {
  username: '  Juan.Perez  ',
  password: 'Una-clave-larga-123',
  full_name: ' Juan Pérez ',
  phone: '',
  role: 'barber',
  branch_id: '11111111-1111-4111-8111-111111111111',
};
describe('Contrato de creación de empleados', () => {
  it('exige una única sucursal al crear un barbero', () => {
    expect(() => parseStaffInput({ ...valid, branch_id: null })).toThrow('sucursal');
    expect(() => parseStaffInput({ ...valid, branch_id: ['a', 'b'] })).toThrow('sucursal');
  });
  it('normaliza usuario/nombre y permite teléfono vacío', () => {
    expect(parseStaffInput(valid)).toMatchObject({
      username: 'juan.perez',
      full_name: 'Juan Pérez',
      phone: null,
    });
  });
  it('permite recepcionistas', () => {
    expect(parseStaffInput({ ...valid, role: 'reception' }).role).toBe('reception');
  });
  it.each(['admin', null, 'owner', ''])('rechaza rol %s aunque se manipule el formulario', role => {
    expect(() => parseStaffInput({ ...valid, role })).toThrow('El rol');
  });
  it.each(['ab', 'un usuario', 'juan@correo.com', '.juan', 'áéíóú', 'a'.repeat(41)])(
    'rechaza usuario inválido %s',
    username => {
      expect(() => parseStaffInput({ ...valid, username })).toThrow('El usuario');
    }
  );
  it('rechaza contraseñas cortas y datos incompletos', () => {
    expect(() => parseStaffInput({ ...valid, password: '1234' })).toThrow('contraseña');
    expect(() => parseStaffInput(null)).toThrow();
  });
});
