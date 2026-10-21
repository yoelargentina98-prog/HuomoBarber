import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { handleCreateStaff } from './handler.ts';

Deno.serve((request: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key)
    return Response.json({ error: 'El servidor no está configurado.' }, { status: 503 });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return handleCreateStaff(request, admin);
});
