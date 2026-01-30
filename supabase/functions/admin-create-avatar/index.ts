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
      .select('role, is_active')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin' || !profile.is_active) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const { user_id, name, cover_image_url } = body || {};

    if (!user_id || !name) {
      return jsonResponse({ error: 'Campos obrigatórios ausentes' }, 400);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: avatar, error: avatarError } = await admin
      .from('avatars')
      .insert({
        user_id,
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
