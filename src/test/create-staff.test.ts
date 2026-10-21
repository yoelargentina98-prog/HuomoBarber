// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleCreateStaff } from '../../supabase/functions/create-staff/handler';

const input = {
  username: 'juan',
  password: 'Una-clave-larga-123',
  full_name: 'Juan Pérez',
  role: 'barber',
  branch_id: '11111111-1111-4111-8111-111111111111',
};
function setup(role = 'admin', profileError: object | null = null) {
  const roleQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  };
  const profileQuery = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'new', ...input, password: undefined },
      error: profileError,
    }),
  };
  const branchQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: input.branch_id }, error: null }),
  };
  // La primera consulta de profiles verifica al solicitante; la segunda guarda el alta.
  let profileCalls = 0;
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'caller' } }, error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new' } }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((table: string) =>
      table === 'branches' ? branchQuery : ++profileCalls === 1 ? roleQuery : profileQuery
    ),
  };
  const call = (body: object = input, token = 'valid') =>
    handleCreateStaff(
      new Request('https://example.test', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      }),
      client as unknown as SupabaseClient
    );
  return { client, profileQuery, branchQuery, call };
}
describe('Autorización y consistencia de create-staff', () => {
  it('rechaza sucursales inexistentes o inactivas antes de crear la cuenta', async () => {
    const { call, client, branchQuery } = setup();
    branchQuery.single.mockResolvedValue({ data: null, error: null });
    expect((await call()).status).toBe(400);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it('rechaza solicitudes anónimas sin crear cuentas', async () => {
    const { call, client } = setup();
    expect((await call(input, '')).status).toBe(401);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it('rechaza un token inválido', async () => {
    const { call, client } = setup();
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    expect((await call()).status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });
  it.each(['barber', 'reception'])('rechaza el rol %s', async role => {
    const { call, client } = setup(role);
    expect((await call()).status).toBe(403);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it('impide crear administradores manipulando el request', async () => {
    const { call, client } = setup();
    expect((await call({ ...input, role: 'admin' })).status).toBe(400);
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it('crea Auth y perfil sin devolver contraseña', async () => {
    const { call, client, profileQuery } = setup();
    const response = await call();
    expect(response.status).toBe(201);
    expect(client.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'juan@staff.huomo.invalid', email_confirm: true })
    );
    expect(profileQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new', role: 'barber' }),
      { onConflict: 'id' }
    );
    expect(JSON.stringify(await response.json())).not.toContain(input.password);
  });
  it('informa usuario duplicado sin tocar un perfil existente', async () => {
    const { call, client, profileQuery } = setup();
    client.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists' },
    });
    expect((await call()).status).toBe(409);
    expect(profileQuery.upsert).not.toHaveBeenCalled();
  });
  it('revierte la cuenta si falla el perfil', async () => {
    const { call, client } = setup('admin', { code: '23505' });
    expect((await call()).status).toBe(409);
    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith('new');
  });
  it('informa cuando también falla la compensación', async () => {
    const { call, client } = setup('admin', { code: 'XX000' });
    client.auth.admin.deleteUser.mockResolvedValue({ error: new Error('offline') });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await call();
    expect(response.status).toBe(500);
    expect((await response.json()).error).toContain('Alta incompleta');
    log.mockRestore();
  });
});
