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
    const {
      client_id,
      name,
      email,
      password,
      client_url,
      modality,
      current_plan,
      plan_start_date,
      plan_expiration_date,
    } = body || {};

    if (!client_id) {
      return jsonResponse({ error: 'client_id obrigatório' }, 400);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: clientRow, error: clientError } = await admin
      .from('admin_clients')
      .select('id, name, email, user_id, client_url')
      .eq('id', client_id)
      .single();

    if (clientError || !clientRow) {
      return jsonResponse({ error: 'Cliente não encontrado' }, 404);
    }

    let targetUserId = clientRow.user_id as string | null;

    if (!targetUserId) {
      const { data: usersResult, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 2000,
      });
      if (listError) {
        return jsonResponse({ error: listError.message }, 500);
      }

      const foundByEmail = usersResult?.users?.find(
        (u) => u.email?.toLowerCase() === String(email || clientRow.email).toLowerCase(),
      );

      if (foundByEmail) {
        targetUserId = foundByEmail.id;
        await admin.from('admin_clients').update({ user_id: targetUserId }).eq('id', client_id);
      }
    }

    if (!targetUserId) {
      return jsonResponse({ error: 'Usuário não encontrado para atualizar' }, 400);
    }

    if (email) {
      const { data: usersResult, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 2000,
      });
      if (listError) {
        return jsonResponse({ error: listError.message }, 500);
      }

      const emailOwner = usersResult?.users?.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase(),
      );
      if (emailOwner && emailOwner.id !== targetUserId) {
        return jsonResponse({ error: 'E-mail já em uso por outro usuário' }, 409);
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    if (Object.keys(updatePayload).length > 0) {
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(targetUserId, {
        ...updatePayload,
        email_confirm: true,
      });
      if (updateAuthError) {
        return jsonResponse({ error: updateAuthError.message }, 500);
      }
    }

    const { error: profileUpsertError } = await admin
      .from('profiles')
      .upsert(
        {
          user_id: targetUserId,
          email: email ?? clientRow.email,
          full_name: name ?? clientRow.name,
          organization_id: profile.organization_id,
          role: 'member',
          is_active: true,
        },
        { onConflict: 'user_id' },
      );

    if (profileUpsertError) {
      return jsonResponse({ error: profileUpsertError.message }, 500);
    }

    const updateClientPayload: Record<string, unknown> = {
      name: name ?? clientRow.name,
      email: email ?? clientRow.email,
      client_url: client_url ?? clientRow.client_url,
      modality: modality ?? null,
      current_plan: current_plan ?? null,
      plan_start_date: plan_start_date ?? null,
      plan_expiration_date: plan_expiration_date ?? null,
    };
    if (password) {
      updateClientPayload.password_hash = password;
    }

    const { error: updateClientError } = await admin
      .from('admin_clients')
      .update(updateClientPayload)
      .eq('id', client_id);

    if (updateClientError) {
      return jsonResponse({ error: updateClientError.message }, 500);
    }

    if (client_url && client_url !== clientRow.client_url) {
      await admin.from('client_url_history').insert({
        client_id,
        old_url: clientRow.client_url,
        new_url: client_url,
        changed_by: 'admin',
      });
    }

    return jsonResponse({ ok: true, user_id: targetUserId });
  } catch (err) {
    console.error('[admin-update-client]', err);
    return jsonResponse({ error: 'Erro interno' }, 500);
  }
});
