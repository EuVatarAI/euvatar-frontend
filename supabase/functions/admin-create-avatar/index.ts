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
    const { user_id, client_id, email, name, cover_image_url } = body || {};

    if (!name) {
      return jsonResponse({ error: 'Campos obrigatórios ausentes' }, 400);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let resolvedUserId = user_id as string | undefined;
    let resolvedEmail = email as string | undefined;

    if (!resolvedUserId && client_id) {
      const { data: clientRow } = await admin
        .from('admin_clients')
        .select('user_id, email')
        .eq('id', client_id)
        .maybeSingle();
      resolvedUserId = clientRow?.user_id || resolvedUserId;
      resolvedEmail = clientRow?.email || resolvedEmail;
    }

    if (!resolvedUserId && resolvedEmail) {
      const { data: byEmail, error: byEmailError } = await admin.auth.admin.getUserByEmail(resolvedEmail);
      if (!byEmailError && byEmail?.user) {
        resolvedUserId = byEmail.user.id;
      }
    }

    if (!resolvedUserId) {
      return jsonResponse({ error: 'Usuário não encontrado para criar perfil' }, 400);
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (!targetProfile?.user_id) {
      let { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(resolvedUserId);
      if ((authUserError || !authUser?.user) && resolvedEmail) {
        const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (!usersError && usersData?.users?.length) {
          const found = usersData.users.find((u) => u.email === resolvedEmail);
          if (found) {
            authUser = { user: found };
            resolvedUserId = found.id;
            authUserError = null;
          }
        }
      }
      if (authUserError || !authUser?.user) {
        return jsonResponse({ error: 'Usuário não encontrado para criar perfil' }, 400);
      }

      if (client_id && resolvedUserId !== user_id) {
        await admin.from('admin_clients').update({ user_id: resolvedUserId }).eq('id', client_id);
      }

      const { error: profileUpsertError } = await admin
        .from('profiles')
        .upsert({
          user_id: resolvedUserId,
          email: authUser.user.email || resolvedEmail || null,
          full_name: authUser.user.user_metadata?.full_name || null,
          organization_id: profile.organization_id || null,
          role: 'member',
          is_active: true,
        }, { onConflict: 'user_id' });

      if (profileUpsertError) {
        return jsonResponse({ error: profileUpsertError.message }, 500);
      }
    }

    const { data: avatar, error: avatarError } = await admin
      .from('avatars')
      .insert({
        user_id: resolvedUserId,
        name,
        backstory: '',
        language: 'pt-BR',
        ai_model: 'gpt-4',
        voice_model: 'default',
        cover_image_url: cover_image_url || null,
      })
      .select('id, name, cover_image_url, created_at, updated_at')
      .single();

    if (avatarError) {
      return jsonResponse({ error: avatarError.message }, 500);
    }

    return jsonResponse({ ok: true, avatar });
  } catch (err) {
    console.error('[admin-create-avatar]', err);
    return jsonResponse({ error: 'Erro interno' }, 500);
  }
});
