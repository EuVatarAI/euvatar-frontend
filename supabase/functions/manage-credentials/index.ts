import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTERNAL_PASSWORD = 'B4b4d0@15';
const UNLOCK_TTL_MS = 10 * 60 * 1000;

function encrypt(text: string): string {
  return btoa(text);
}

function decrypt(encrypted: string): string {
  return atob(encrypted);
}

type CredentialStatus = 'valid' | 'invalid' | 'error';

const encoder = new TextEncoder();

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(value.length + (4 - (value.length % 4 || 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getUnlockKey() {
  const secret = Deno.env.get('UNLOCK_TOKEN_SECRET') || INTERNAL_PASSWORD;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signUnlockToken(payload: Record<string, unknown>) {
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const key = await getUnlockKey();
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes);
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`;
}

async function verifyUnlockToken(token: string) {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const payloadBytes = base64UrlDecode(payloadPart);
  const signatureBytes = base64UrlDecode(signaturePart);
  const key = await getUnlockKey();
  const ok = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes);
  if (!ok) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function credentialResponse(
  status: CredentialStatus,
  message: string,
  extra: Record<string, unknown> = {},
  httpStatus = 200
) {
  return new Response(
    JSON.stringify({
      status,
      message,
      checked_at: new Date().toISOString(),
      ...extra,
    }),
    {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/* ===========================================================
   PROVIDER HELPERS
=========================================================== */

async function fetchHeyGenAccountId(apiKey: string) {
  console.log('[MANAGE_CREDENTIALS][PROVIDER=heygen] Validating account via HeyGen API');

  const urls = [
    'https://api.heygen.com/v2/get_remaining_quota',
    'https://api.heygen.com/v2/user/remaining_quota',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'X-Api-Key': apiKey,
          Accept: 'application/json',
        },
      });

      if (res.status === 401) {
        return { status: 'invalid' };
      }

      if (!res.ok) continue;

      const data = await res.json();
      const root = data?.data || data;
      const accountId =
        root?.account_id ??
        root?.accountId ??
        root?.user_id ??
        root?.userId ??
        null;

      console.log('[MANAGE_CREDENTIALS][PROVIDER=heygen] Account validated:', accountId);
      return { status: 'ok', accountId };
    } catch (err) {
      console.error('[MANAGE_CREDENTIALS][PROVIDER=heygen] Error:', err);
    }
  }

  return { status: 'error' };
}

async function fetchLiveAvatarById(apiKey: string, avatarId: string) {
  console.log('[MANAGE_CREDENTIALS][PROVIDER=liveavatar] Validating avatar:', avatarId);

  try {
    const res = await fetch(`https://api.liveavatar.com/v1/avatars/${avatarId}`, {
      headers: {
        'X-API-KEY': apiKey,
        Accept: 'application/json',
      },
    });

    if (res.status === 401) return { isValid: false };
    if (res.status === 404) return { isValid: false };
    if (!res.ok) return { isValid: false };

    console.log('[MANAGE_CREDENTIALS][PROVIDER=liveavatar] Avatar validated successfully');
    return { isValid: true };
  } catch (err) {
    console.error('[MANAGE_CREDENTIALS][PROVIDER=liveavatar] Error:', err);
    return { isValid: false };
  }
}

async function fetchHeyGenAvatarDetails(apiKey: string, avatarId: string) {
  console.log('[MANAGE_CREDENTIALS][PROVIDER=heygen] Fetching avatar details:', avatarId);

  try {
    const res = await fetch(`https://api.heygen.com/v1/interactive_avatar/${avatarId}`, {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) return { isValid: false, orientation: null };

    const data = await res.json();
    let orientation: 'vertical' | 'horizontal' = 'vertical';

    const a = data?.data;
    if (a?.width && a?.height) {
      orientation = a.width > a.height ? 'horizontal' : 'vertical';
    }

    console.log('[MANAGE_CREDENTIALS][PROVIDER=heygen] Orientation detected:', orientation);
    return { isValid: true, orientation };
  } catch (err) {
    console.error('[MANAGE_CREDENTIALS][PROVIDER=heygen] Error:', err);
    return { isValid: false, orientation: null };
  }
}

/* ===========================================================
   MAIN HANDLER
=========================================================== */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const provider = (Deno.env.get('AVATAR_PROVIDER') || 'heygen').toLowerCase();
    console.log(`[MANAGE_CREDENTIALS] Provider resolved: ${provider}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return credentialResponse('error', 'Unauthorized', {}, 401);
    }

    const body = await req.json();
    const {
      action,
      avatarId,
      apiKey,
      avatarExternalId,
      accountId,
      password,
      credentials,
    } = body;

    console.log(
      `[MANAGE_CREDENTIALS][PROVIDER=${provider}] Action=${action} | User=${data.user.id} | Avatar=${avatarId}`
    );

    /* ===================== UNLOCK ===================== */

    if (action === 'unlock') {
      if (password !== INTERNAL_PASSWORD) {
        return new Response(
          JSON.stringify({ success: false, message: 'Senha inválida' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expiresAt = Date.now() + UNLOCK_TTL_MS;
      const unlockToken = await signUnlockToken({
        userId: data.user.id,
        avatarId: avatarId ?? null,
        exp: expiresAt,
      });

      return new Response(
        JSON.stringify({ success: true, unlockToken, expiresAt }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ===================== FETCH ===================== */

    if (action === 'fetch') {
      const { data: stored, error: fetchError } = await supabase
        .from('avatar_credentials')
        .select('account_id, api_key, avatar_external_id, voice_id, context_id')
        .eq('avatar_id', avatarId)
        .maybeSingle();

      if (fetchError) {
        console.error('[MANAGE_CREDENTIALS][FETCH] Error:', fetchError);
        return new Response(JSON.stringify({ error: 'Erro ao buscar credenciais' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!stored) {
        return new Response(JSON.stringify({ credentials: null }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          credentials: {
            accountId: stored.account_id ? decrypt(stored.account_id) : '',
            apiKey: stored.api_key ? decrypt(stored.api_key) : '',
            avatarExternalId: stored.avatar_external_id ? decrypt(stored.avatar_external_id) : '',
            voiceId: stored.voice_id ? decrypt(stored.voice_id) : '',
            contextId: stored.context_id ? decrypt(stored.context_id) : '',
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ===================== SAVE ===================== */

    if (action === 'save') {
      const payload = credentials ?? {};
      const resolvedAccountId = String(payload.accountId ?? accountId ?? '').trim();
      const resolvedApiKey = String(payload.apiKey ?? apiKey ?? '').trim();
      const resolvedAvatarExternalId = String(payload.avatarExternalId ?? avatarExternalId ?? '').trim();
      const resolvedVoiceId = String(payload.voiceId ?? body.voiceId ?? '').trim();
      const resolvedContextId = String(payload.contextId ?? body.contextId ?? '').trim();
      const unlockToken = payload.unlockToken;

      if (!resolvedAccountId || !resolvedApiKey || !resolvedAvatarExternalId) {
        return credentialResponse('error', 'Campos obrigatórios ausentes', {}, 400);
      }

      if (unlockToken) {
        const tokenPayload = await verifyUnlockToken(unlockToken);
        if (!tokenPayload || tokenPayload.userId !== data.user.id) {
          return credentialResponse('error', 'Sessão expirada. Desbloqueie novamente.', {}, 403);
        }
      }

      console.log(
        `[MANAGE_CREDENTIALS][PROVIDER=${provider}] Starting credential validation`
      );

      let validation;

      if (provider === 'liveavatar') {
        validation = await fetchLiveAvatarById(resolvedApiKey, resolvedAvatarExternalId);
      } else {
        const accountCheck = await fetchHeyGenAccountId(resolvedApiKey);
        if (accountCheck.status !== 'ok' || accountCheck.accountId !== resolvedAccountId) {
          return credentialResponse('invalid', 'Conta inválida');
        }

        validation = await fetchHeyGenAvatarDetails(resolvedApiKey, resolvedAvatarExternalId);
      }

      if (!validation?.isValid) {
        console.warn(
          `[MANAGE_CREDENTIALS][PROVIDER=${provider}] Credential validation failed`
        );
        return credentialResponse('invalid', 'Credenciais inválidas');
      }

      console.log(
        `[MANAGE_CREDENTIALS][PROVIDER=${provider}] Credentials validated successfully`
      );

      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await admin.from('avatar_credentials').upsert({
        avatar_id: avatarId,
        account_id: encrypt(resolvedAccountId),
        api_key: encrypt(resolvedApiKey),
        avatar_external_id: encrypt(resolvedAvatarExternalId),
        voice_id: resolvedVoiceId ? encrypt(resolvedVoiceId) : null,
        context_id: resolvedContextId ? encrypt(resolvedContextId) : null,
        updated_at: new Date().toISOString(),
      });

      console.log(
        `[MANAGE_CREDENTIALS][PROVIDER=${provider}] Credentials saved`
      );

      return credentialResponse('valid', 'Credenciais salvas com sucesso', {
        provider,
        avatarId,
        avatarExternalId: resolvedAvatarExternalId,
        voiceId: resolvedVoiceId || null,
        contextId: resolvedContextId || null,
        orientation: validation.orientation ?? null,
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[MANAGE_CREDENTIALS][FATAL]', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
