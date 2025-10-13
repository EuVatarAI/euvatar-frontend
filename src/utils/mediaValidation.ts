type MediaKind = 'image' | 'video';

export type ValidationResult = {
  ok: boolean;
  kind?: MediaKind;
  reason?: string;
  contentType?: string;
  size?: number;
};

const DOMAIN_WHITELIST = [
  /^https:\/\/cdn\.euvatar\.com\/.*/i,
  /^https:\/\/.+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
  /^https:\/\/.*\.cloudinary\.com\/.*/i,
  /^https:\/\/.*\.cloudfront\.net\/.*/i,
  /^https:\/\/.*\.s3\.amazonaws\.com\/.*/i,
];

const EXT_IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const EXT_VIDEO = /\.(mp4|webm|mov|m4v)$/i;

const isWhitelisted = (url: string) => DOMAIN_WHITELIST.some(r => r.test(url));

export const guessKindByExtension = (url: string): MediaKind | undefined => {
  if (EXT_IMAGE.test(url)) return 'image';
  if (EXT_VIDEO.test(url)) return 'video';
  return undefined;
};

const withTimeout = <T>(p: Promise<T>, timeoutMs: number): Promise<T | undefined> =>
  new Promise<T | undefined>((resolve) => {
    const t = setTimeout(() => resolve(undefined), timeoutMs);
    p.then(v => { clearTimeout(t); resolve(v); })
      .catch(() => { clearTimeout(t); resolve(undefined); });
  });

export const validateMediaUrlClient = async (
  url: string, 
  timeoutMs = 2500
): Promise<ValidationResult> => {
  if (!url) return { ok: false, reason: 'URL vazia' };
  
  let u: URL;
  try { 
    u = new URL(url); 
  } catch { 
    return { ok: false, reason: 'URL inválida' }; 
  }
  
  if (u.protocol !== 'https:') {
    return { ok: false, reason: 'Somente HTTPS é permitido' };
  }
  
  if (!isWhitelisted(url)) {
    return { ok: false, reason: 'Domínio não permitido. Use CDNs aprovados (Supabase, Cloudinary, CloudFront, S3)' };
  }

  const kindHint = guessKindByExtension(url);

  if (kindHint === 'image') {
    const p = new Promise<ValidationResult>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ ok: true, kind: 'image' });
      img.onerror = () => resolve({ ok: false, reason: 'Não foi possível carregar a imagem' });
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    });
    
    const r = await withTimeout(p, timeoutMs);
    if (r) return r;
    return { ok: false, reason: 'Timeout ao carregar imagem' };
  }

  if (kindHint === 'video' || !kindHint) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    if (EXT_VIDEO.test(url)) {
      const can = video.canPlayType(
        url.endsWith('.mp4') ? 'video/mp4' : 
        url.endsWith('.webm') ? 'video/webm' : ''
      );
      if (can === '') {
        return { ok: false, reason: 'Codec de vídeo não suportado pelo navegador' };
      }
    }
    
    const p = new Promise<ValidationResult>((resolve) => {
      video.onloadedmetadata = () => resolve({ ok: true, kind: 'video' });
      video.onerror = () => resolve({ ok: false, reason: 'Não foi possível carregar o vídeo' });
      video.src = url;
    });
    
    const r = await withTimeout(p, timeoutMs);
    if (r) return r;
    return { ok: false, reason: 'Timeout ao carregar vídeo' };
  }

  return { ok: false, reason: 'Tipo de arquivo não reconhecido' };
};

// Cache de validações para evitar requisições repetidas
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const validateMediaUrlWithCache = async (url: string): Promise<ValidationResult> => {
  const cached = validationCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await validateMediaUrlClient(url);
  validationCache.set(url, { result, timestamp: Date.now() });
  
  return result;
};

// Validação no servidor
export const validateMediaUrlServer = async (url: string): Promise<ValidationResult> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return { ok: false, reason: 'Erro ao validar no servidor' };
    }

    return await response.json();
  } catch (error) {
    console.error('Server validation error:', error);
    return { ok: false, reason: 'Erro de conexão com o servidor' };
  }
};
