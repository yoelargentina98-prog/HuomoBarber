import type { SupabaseClient } from '@supabase/supabase-js';
import { parseStaffInput } from '../_shared/staff-input.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => Response.json(body, { status, headers });

// La clave privilegiada solo existe en los secretos de Edge Functions.
export async function handleCreateStaff(
  request: Request,
  admin: SupabaseClient
): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  try {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'Iniciá sesión como administrador.' });
    const { data: identity, error: authError } = await admin.auth.getUser(token);
    if (authError || !identity.user)
      return reply(401, { error: 'La sesión venció. Volvé a ingresar.' });
    const { data: profile, error: roleError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', identity.user.id)
      .single();
    if (roleError)
      return reply(403, { error: 'No se pudo verificar el permiso de administrador.' });
    if (profile?.role !== 'admin')
      return reply(403, { error: 'Solo un administrador puede crear empleados.' });

    const raw = await request.text();
    if (raw.length > 8192) return reply(413, { error: 'La solicitud es demasiado grande.' });
    let input;
    try {
      input = parseStaffInput(JSON.parse(raw));
    } catch (error) {
      return reply(400, {
        error: error instanceof SyntaxError ? 'JSON inválido.' : (error as Error).message,
      });
    }
    if (input.branch_id) {
      const { data: branch, error: branchError } = await admin
        .from('branches')
        .select('id')
        .eq('id', input.branch_id)
        .eq('active', true)
        .single();
      if (branchError || !branch)
        return reply(400, { error: 'La sucursal no existe o está inactiva.' });
    }
    // Dominio reservado: identificador técnico, no se envían correos ni invitaciones.
    const { data, error } = await admin.auth.admin.createUser({
      email: `${input.username}@staff.huomo.invalid`,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      if (error?.code === 'email_exists' || error?.code === 'user_already_exists') {
        return reply(409, { error: 'Ese nombre de usuario ya existe.' });
      }
      return reply(400, {
        error: 'No se pudo crear la cuenta. Revisá los datos y la política de contraseñas.',
      });
    }
    const { data: staff, error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          username: input.username,
          full_name: input.full_name,
          phone: input.phone,
          role: input.role,
          branch_id: input.branch_id ?? null,
        },
        { onConflict: 'id' }
      )
      .select('id, username, full_name, phone, role, created_at, branch_id, branches(name)')
      .single();
    if (profileError) {
      // Auth y Postgres no comparten transacción. Compensar para evitar cuentas huérfanas.
      const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id);
      if (rollbackError) {
        console.error('Requiere limpieza de alta incompleta:', data.user.id);
        return reply(500, {
          error:
            'Alta incompleta. Informá al responsable para revisar la cuenta antes de reintentar.',
        });
      }
      return reply(profileError.code === '23505' ? 409 : 500, {
        error:
          'No se guardó el perfil. La cuenta fue revertida; revisá el usuario o las migraciones.',
      });
    }
    const relatedBranch = Array.isArray(staff.branches) ? staff.branches[0] : staff.branches;
    return reply(201, { staff: { ...staff, branch_name: relatedBranch?.name ?? null } });
  } catch {
    return reply(500, {
      error: 'No se pudo completar la operación. Revisá el listado antes de reintentar.',
    });
  }
}
