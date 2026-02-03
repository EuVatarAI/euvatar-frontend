export type AvatarHeyGenUsage = {
  avatarId: string;
  heygenAvatarId: string;
  totalSeconds: number;
  totalMinutes: number;
  heygenCredits: number;
  euvatarCredits: number;
  sessionCount: number;
};

export type HeyGenCredits = {
  error?: string;
  missingApiKey?: boolean;
  needsCredentialUpdate?: boolean;
  euvatarCredits: number;
  heygenCredits: number;
  totalEuvatarCredits: number;
  minutesRemaining: number;
  totalMinutes: number;
  hoursRemaining: number;
  totalHours: number;
  percentageRemaining?: number;
  usedEuvatarCredits?: number;
  usedMinutes?: number;
  avatarUsage?: AvatarHeyGenUsage[];
};

const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || '';
export async function fetchBackendCredits(authToken?: string): Promise<HeyGenCredits | null> {
  if (!backendUrl) {
    console.error('VITE_BACKEND_URL não configurada');
    return null;
  }

  try {
    const url = `${backendUrl.replace(/\/$/, '')}/credits`;
    const resp = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });

    const data = await resp.json();

    if (data?.error && !data?.euvatarCredits) {
      const errorText = String(data?.error || '');
      const missingApiKey = /missing_api_key/i.test(errorText);
      return { ...data, missingApiKey } as HeyGenCredits;
    }

    const remaining = Number(data?.euvatarCredits ?? 0);
    const total = Number(data?.totalEuvatarCredits ?? remaining);
    const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;

    const errorText = String(data?.error || '');
    const missingApiKey = /missing_api_key/i.test(errorText);
    return {
      ...data,
      missingApiKey,
      percentageRemaining: percentage,
    } as HeyGenCredits;
  } catch (err) {
    console.error('Erro ao buscar créditos no backend', err);
    return null;
  }
}
