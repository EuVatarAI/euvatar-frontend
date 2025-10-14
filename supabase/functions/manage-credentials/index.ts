import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Internal password for unlocking credentials
const INTERNAL_PASSWORD = 'B4b4d0@15';

// Simple encryption/decryption using base64 (in production, use proper encryption)
function encrypt(text: string): string {
  return btoa(text);
}

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
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, password, avatarId, accountId, apiKey, avatarExternalId } = body;

    console.log(`Credential action: ${action} for avatar: ${avatarId} by user: ${user.id}`);

    // Validate password for unlock action
    if (action === 'unlock') {
      if (password !== INTERNAL_PASSWORD) {
        console.log('Invalid password attempt');
        return new Response(JSON.stringify({ error: 'Senha inválida' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate temporary unlock token (valid for 10 minutes)
      const unlockToken = crypto.randomUUID();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      console.log('Unlock successful, token generated');
      return new Response(
        JSON.stringify({
          success: true,
          unlockToken,
          expiresAt,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Save credentials action
    if (action === 'save') {
      if (!accountId || !apiKey || !avatarExternalId) {
        return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let finalAvatarId = avatarId;

      // Se não houver avatarId, criar um avatar básico
      if (!finalAvatarId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: newAvatar, error: createError } = await supabaseAdmin
          .from('avatars')
          .insert({
            user_id: user.id,
            name: 'Meu Avatar',
            backstory: 'Avatar criado automaticamente',
            language: 'pt-BR',
            ai_model: 'gpt-4',
            voice_model: 'default',
          })
          .select()
          .single();

        if (createError || !newAvatar) {
          console.error('Error creating avatar:', createError);
          return new Response(JSON.stringify({ error: 'Erro ao criar avatar' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        finalAvatarId = newAvatar.id;
        console.log('Avatar created with ID:', finalAvatarId);
      } else {
        // Verify user owns the avatar
        const { data: avatar, error: avatarError } = await supabase
          .from('avatars')
          .select('id, user_id')
          .eq('id', finalAvatarId)
          .eq('user_id', user.id)
          .single();

        if (avatarError || !avatar) {
          console.error('Avatar not found or unauthorized:', avatarError);
          return new Response(JSON.stringify({ error: 'Avatar não encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Validate credentials with external provider (mock validation)
      // In production, you would make actual API call to validate
      console.log('Validating credentials with external provider...');
      const isValid = await validateExternalCredentials(accountId, apiKey, avatarExternalId);

      if (!isValid) {
        console.log('Credential validation failed');
        return new Response(
          JSON.stringify({ error: 'Credenciais inválidas. Verifique os dados com o provedor.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Encrypt credentials before storing
      const encryptedAccountId = encrypt(accountId);
      const encryptedApiKey = encrypt(apiKey);
      const encryptedAvatarId = encrypt(avatarExternalId);

      // Use service role client for insert/update
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Upsert credentials
      const { error: upsertError } = await supabaseAdmin
        .from('avatar_credentials')
        .upsert({
          avatar_id: finalAvatarId,
          account_id: encryptedAccountId,
          api_key: encryptedApiKey,
          avatar_external_id: encryptedAvatarId,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Error saving credentials:', upsertError);
        return new Response(JSON.stringify({ error: 'Erro ao salvar credenciais' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create audit log
      await supabaseAdmin.from('credential_audit_logs').insert({
        avatar_id: finalAvatarId,
        action: 'credentials_updated',
        performed_by: user.id,
        details: {
          fields: ['account_id', 'api_key', 'avatar_external_id'],
        },
      });

      console.log('Credentials saved and audit log created');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Credenciais salvas com sucesso',
          avatarId: finalAvatarId 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch credentials (decrypted for display)
    if (action === 'fetch') {
      const { data: creds, error: fetchError } = await supabase
        .from('avatar_credentials')
        .select('*')
        .eq('avatar_id', avatarId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching credentials:', fetchError);
        return new Response(JSON.stringify({ error: 'Erro ao buscar credenciais' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!creds) {
        return new Response(
          JSON.stringify({ credentials: null }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Decrypt for display (only visible fields, not full api_key)
      const decryptedCreds = {
        accountId: decrypt(creds.account_id),
        apiKey: '••••••••' + decrypt(creds.api_key).slice(-4), // Show only last 4 chars
        avatarExternalId: decrypt(creds.avatar_external_id),
      };

      return new Response(
        JSON.stringify({ credentials: decryptedCreds }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in manage-credentials function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Mock validation function - replace with actual API call
async function validateExternalCredentials(
  accountId: string,
  apiKey: string,
  avatarExternalId: string
): Promise<boolean> {
  // In production, make actual API call to external provider
  // Example:
  // const response = await fetch('https://provider.com/validate', {
  //   headers: { 'Authorization': `Bearer ${apiKey}` },
  //   body: JSON.stringify({ accountId, avatarId: avatarExternalId })
  // });
  // return response.ok;

  console.log('Mock validation - accepting all credentials');
  return true; // For now, accept all credentials
}
