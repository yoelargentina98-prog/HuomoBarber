export interface StaffInput {
  username: string;
  password: string;
  full_name: string;
  phone: string | null;
  role: 'barber' | 'reception';
  branch_id?: string | null;
}

/** Contrato compartido por formulario y servidor. Nunca registra contraseñas. */
export function parseStaffInput(value: unknown): StaffInput {
  if (!value || typeof value !== 'object') throw new Error('Datos de empleado inválidos.');
  const data = value as Record<string, unknown>;
  const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
  const full_name = typeof data.full_name === 'string' ? data.full_name.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
    throw new Error(
      'El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo.'
    );
  }
  if (full_name.length < 2 || full_name.length > 100)
    throw new Error('El nombre debe tener entre 2 y 100 caracteres.');
  if (password.length < 12 || password.length > 128)
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  if (phone.length > 30) throw new Error('El teléfono no puede superar los 30 caracteres.');
  if (data.role !== 'barber' && data.role !== 'reception')
    throw new Error('El rol debe ser Barbero o Recepcionista.');
  const branch_id =
    typeof data.branch_id === 'string' && data.branch_id.trim() ? data.branch_id.trim() : null;
  if (data.role === 'barber' && !branch_id) throw new Error('Elegí una sucursal para el barbero.');
  if (
    branch_id &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branch_id)
  )
    throw new Error('La sucursal es inválida.');
  return { username, password, full_name, phone: phone || null, role: data.role, branch_id };
}
