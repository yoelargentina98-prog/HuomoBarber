import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => Response.json(body, { status, headers });
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply(503, { error: 'Servidor no configurado.' });
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'Sesión requerida.' });
    const { data: identity, error: authError } = await admin.auth.getUser(token);
    if (authError || !identity.user) return reply(401, { error: 'Sesión inválida.' });
    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', identity.user.id)
      .single();
    if (caller?.role !== 'admin')
      return reply(403, { error: 'Solo administración puede cambiar el estado.' });
    const raw = await request.text();
    if (raw.length > 1024) return reply(413, { error: 'Solicitud demasiado grande.' });
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      return reply(400, { error: 'Solicitud inválida.' });
    }
    if (
      !input ||
      typeof input.employee_id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(input.employee_id) ||
      typeof input.active !== 'boolean'
    )
      return reply(400, { error: 'Datos inválidos.' });
    const { data: target } = await admin
      .from('profiles')
      .select('role')
      .eq('id', input.employee_id)
      .single();
    if (target?.role !== 'barber' && target?.role !== 'reception')
      return reply(400, { error: 'Solo se pueden modificar barberos y recepcionistas.' });
    const { data: existing, error: existingError } = await admin.auth.admin.getUserById(
      input.employee_id
    );
    if (existingError || !existing.user) return reply(404, { error: 'Cuenta no encontrada.' });
    const priorBan = existing.user.banned_until;
    const { error: banError } = await admin.auth.admin.updateUserById(input.employee_id, {
      ban_duration: input.active ? 'none' : '876000h',
    });
    if (banError) return reply(500, { error: 'No se pudo actualizar el acceso.' });
    const { error: statusError } = await admin.rpc('set_employee_access', {
      target_employee: input.employee_id,
      enabled: input.active,
      acting_admin: identity.user.id,
    });
    if (statusError) {
      const hours = priorBan ? Math.ceil((new Date(priorBan).getTime() - Date.now()) / 3600000) : 0;
      const { error: restoreError } = await admin.auth.admin.updateUserById(input.employee_id, {
        ban_duration: hours > 0 ? `${hours}h` : 'none',
      });
      if (restoreError) console.error('Revisar estado de acceso inconsistente:', input.employee_id);
      return reply(500, {
        error: 'No se pudo guardar el estado. Revisá la cuenta antes de reintentar.',
      });
    }
    return reply(200, { ok: true });
  } catch {
    return reply(500, { error: 'No se pudo completar el cambio de estado.' });
  }
});
