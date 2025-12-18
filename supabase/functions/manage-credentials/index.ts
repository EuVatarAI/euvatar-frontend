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

// Fetch avatar details from HeyGen API to get orientation
async function fetchHeyGenAvatarDetails(apiKey: string, avatarExternalId: string): Promise<{
  isValid: boolean;
  orientation: 'vertical' | 'horizontal' | null;
  error?: string;
}> {
  try {
    console.log('Fetching avatar details from HeyGen API...');
    
    // Get interactive avatar details
    const response = await fetch(`https://api.heygen.com/v1/interactive_avatar/${avatarExternalId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', response.status, errorText);
      
      if (response.status === 401) {
        return { isValid: false, orientation: null, error: 'A API key do Euvatar está inválida ou expirada' };
      }
      if (response.status === 404) {
        return { isValid: false, orientation: null, error: 'Avatar não encontrado. Verifique o ID do avatar.' };
      }
      return { isValid: false, orientation: null, error: 'Erro ao validar credenciais com o provedor' };
    }

    const data = await response.json();
    console.log('HeyGen avatar data:', JSON.stringify(data));

    // Determine orientation from avatar data
    // HeyGen returns avatar dimensions or aspect ratio
    let orientation: 'vertical' | 'horizontal' = 'vertical';
    
    if (data.data) {
      const avatarData = data.data;
      
      // Check various possible fields for dimensions
      if (avatarData.width && avatarData.height) {
        orientation = avatarData.width > avatarData.height ? 'horizontal' : 'vertical';
      } else if (avatarData.aspect_ratio) {
        // Parse aspect ratio like "9:16" or "16:9"
        const [w, h] = avatarData.aspect_ratio.split(':').map(Number);
        orientation = w > h ? 'horizontal' : 'vertical';
      } else if (avatarData.orientation) {
        orientation = avatarData.orientation === 'landscape' ? 'horizontal' : 'vertical';
      } else if (avatarData.video_settings?.aspect_ratio) {
        const ratio = avatarData.video_settings.aspect_ratio;
        if (ratio === '16:9' || ratio === '4:3') {
          orientation = 'horizontal';
        } else {
          orientation = 'vertical';
        }
      }
      
      console.log('Detected orientation:', orientation);
    }

    return { isValid: true, orientation };
  } catch (error) {
    console.error('Error fetching HeyGen avatar details:', error);
    return { isValid: false, orientation: null, error: 'Erro de conexão com o provedor' };
  }
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

      // Validate credentials with HeyGen API and get orientation
      console.log('Validating credentials with HeyGen API...');
      const validationResult = await fetchHeyGenAvatarDetails(apiKey, avatarExternalId);

      if (!validationResult.isValid) {
        console.log('Credential validation failed:', validationResult.error);
        return new Response(
          JSON.stringify({ error: validationResult.error || 'Credenciais inválidas' }),
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

      // Update avatar orientation if detected
      if (validationResult.orientation) {
        const { error: orientationError } = await supabaseAdmin
          .from('avatars')
          .update({ avatar_orientation: validationResult.orientation })
          .eq('id', finalAvatarId);

        if (orientationError) {
          console.error('Error updating orientation:', orientationError);
          // Don't fail the request, just log the error
        } else {
          console.log('Avatar orientation updated to:', validationResult.orientation);
        }
      }

      // Create audit log
      await supabaseAdmin.from('credential_audit_logs').insert({
        avatar_id: finalAvatarId,
        action: 'credentials_updated',
        performed_by: user.id,
        details: {
          fields: ['account_id', 'api_key', 'avatar_external_id'],
          orientation: validationResult.orientation,
        },
      });

      console.log('Credentials saved and audit log created');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Credenciais salvas com sucesso',
          avatarId: finalAvatarId,
          orientation: validationResult.orientation,
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
