import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_REDIRECTS = 4;
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME = [
  /^image\/(png|jpe?g|webp|gif)$/i,
  /^video\/(mp4|webm)$/i
];

const isAllowedDomain = (url: URL): boolean => {
  const host = url.host.toLowerCase();
  return (
    host.endsWith('euvatar.com') ||
    host.includes('.supabase.co') ||
    host.includes('.cloudinary.com') ||
    host.includes('.cloudfront.net') ||
    host.includes('.s3.amazonaws.com')
  );
};

const jsonResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return jsonResponse({ ok: false, reason: 'URL não fornecida' }, 400);
    }

    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return jsonResponse({ ok: false, reason: 'URL inválida' }, 400);
    }

    if (u.protocol !== 'https:') {
      return jsonResponse({ ok: false, reason: 'Somente HTTPS é permitido' });
    }

    if (!isAllowedDomain(u)) {
      return jsonResponse({ ok: false, reason: 'Domínio não permitido' });
    }

    let current = u.toString();
    let redirects = 0;
    let res: Response | null = null;

    // Follow redirects
    while (redirects <= MAX_REDIRECTS) {
      res = await fetch(current, { 
        method: 'HEAD',
        redirect: 'manual'
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (location) {
          current = new URL(location, current).toString();
          redirects++;
          continue;
        }
      }
      break;
    }

    if (!res || !res.ok) {
      return jsonResponse({ 
        ok: false, 
        reason: 'Não foi possível acessar a mídia', 
        status: res?.status 
      });
    }

    const contentType = res.headers.get('content-type') || '';
    const contentLengthStr = res.headers.get('content-length') || '';
    const contentLength = parseInt(contentLengthStr || '0', 10);

    // Validate MIME type
    const mimeOk = ALLOWED_MIME.some(rx => rx.test(contentType));
    if (!mimeOk) {
      return jsonResponse({ 
        ok: false, 
        reason: 'Tipo de arquivo não permitido', 
        contentType 
      });
    }

    // Validate size
    if (contentLength && contentLength > MAX_SIZE_BYTES) {
      return jsonResponse({ 
        ok: false, 
        reason: `Arquivo muito grande (máximo: 25MB)`, 
        size: contentLength 
      });
    }

    return jsonResponse({ 
      ok: true, 
      contentType, 
      size: contentLength || null 
    });

  } catch (e) {
    console.error('Validation error:', e);
    return jsonResponse({ 
      ok: false, 
      reason: 'Erro ao validar mídia', 
      error: String(e) 
    }, 500);
  }
});
