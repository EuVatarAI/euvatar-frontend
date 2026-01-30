import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({ error: 'Configuração do Supabase ausente' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active, organization_id')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin' || !profile.is_active) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const { name, email, password } = body || {};

    if (!name || !email || !password) {
      return jsonResponse({ error: 'Campos obrigatórios ausentes' }, 400);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let userId: string | null = null;
    const { data: usersResult, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 2000,
    });

    if (listError) {
      return jsonResponse({ error: listError.message }, 500);
    }

    const existingUser = usersResult?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (existingUser) {
      userId = existingUser.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }
    } else {
      const { data: userResult, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !userResult.user) {
        return jsonResponse({ error: createError?.message || 'Erro ao criar usuário' }, 500);
      }
      userId = userResult.user.id;
    }

    const { error: profileInsertError } = await admin
      .from('profiles')
      .upsert({
        user_id: userId,
        email,
        full_name: name,
        organization_id: profile.organization_id,
        role: 'member',
        is_active: true,
      }, { onConflict: 'user_id' });

    if (profileInsertError) {
      return jsonResponse({ error: profileInsertError.message }, 500);
    }

    const { data: clientRow, error: clientError } = await admin
      .from('admin_clients')
      .upsert({
        name,
        email,
        password_hash: password,
        user_id: userId,
      }, { onConflict: 'email' })
      .select()
      .single();

    if (clientError) {
      return jsonResponse({ error: clientError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      client: clientRow,
      user_id: userId,
    });
  } catch (err) {
    console.error('[admin-create-client]', err);
    return jsonResponse({ error: 'Erro interno' }, 500);
  }
});
