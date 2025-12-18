import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEYGEN_API_URL = 'https://api.heygen.com';

function decrypt(encrypted: string): string {
  return atob(encrypted);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, avatarId, sessionId, text, taskType } = body;

    console.log(`HeyGen Streaming action: ${action} for avatar: ${avatarId}`);

    // Fetch credentials for this avatar
    const { data: creds, error: credsError } = await supabase
      .from('avatar_credentials')
      .select('*')
      .eq('avatar_id', avatarId)
      .single();

    if (credsError || !creds) {
      console.error('No credentials found:', credsError);
      return new Response(JSON.stringify({ error: 'Credenciais não configuradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = decrypt(creds.api_key);
    const avatarExternalId = decrypt(creds.avatar_external_id);

    // Create new streaming session
    if (action === 'create') {
      console.log('Creating new HeyGen streaming session...');
      
      const response = await fetch(`${HEYGEN_API_URL}/v1/streaming.new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          version: 'v2',
          avatar_id: avatarExternalId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen create session error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'Erro ao criar sessão de streaming' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sessionData = await response.json();
      console.log('Session created:', sessionData.data?.session_id);

      return new Response(JSON.stringify({ 
        success: true,
        session: sessionData.data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start streaming session
    if (action === 'start') {
      console.log('Starting HeyGen streaming session:', sessionId);
      
      const response = await fetch(`${HEYGEN_API_URL}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen start session error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'Erro ao iniciar streaming' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startData = await response.json();
      console.log('Session started successfully');

      return new Response(JSON.stringify({ 
        success: true,
        data: startData.data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send text/task to avatar
    if (action === 'task') {
      console.log('Sending task to avatar:', taskType, text?.substring(0, 50));
      
      const response = await fetch(`${HEYGEN_API_URL}/v1/streaming.task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          session_id: sessionId,
          text: text,
          task_type: taskType || 'talk',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen task error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'Erro ao enviar texto' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const taskData = await response.json();
      console.log('Task sent successfully');

      return new Response(JSON.stringify({ 
        success: true,
        data: taskData.data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stop streaming session
    if (action === 'stop') {
      console.log('Stopping HeyGen streaming session:', sessionId);
      
      const response = await fetch(`${HEYGEN_API_URL}/v1/streaming.stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen stop session error:', response.status, errorText);
        // Don't fail on stop errors, session might already be closed
      }

      console.log('Session stopped');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-streaming function:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
