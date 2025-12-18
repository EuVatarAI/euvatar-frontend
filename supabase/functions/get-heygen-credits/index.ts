import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionData {
  session_id: string;
  status: string;
  created_at: number;
  duration: number;
  avatar_id: string;
  voice_name: string;
}

interface AvatarUsage {
  avatarId: string;
  totalSeconds: number;
  totalMinutes: number;
  heygenCredits: number;
  euvatarCredits: number;
  sessionCount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar credenciais e mapeamento de avatares do usuário
    const { data: credentials, error: credError } = await supabaseClient
      .from("avatar_credentials")
      .select("api_key, avatar_id, avatar_external_id")
      .limit(1)
      .maybeSingle();

    if (credError || !credentials) {
      console.log("Nenhuma credencial encontrada:", credError);
      return new Response(JSON.stringify({ 
        error: "Credenciais não configuradas",
        euvatarCredits: 0,
        heygenCredits: 0,
        totalEuvatarCredits: 960,
        minutesRemaining: 0,
        totalMinutes: 240,
        hoursRemaining: 0,
        totalHours: 4,
        avatarUsage: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar todos os mapeamentos de avatares (avatar_external_id -> avatar local)
    const { data: allCredentials } = await supabaseClient
      .from("avatar_credentials")
      .select("avatar_id, avatar_external_id");

    const avatarMapping = new Map<string, string>();
    allCredentials?.forEach(cred => {
      avatarMapping.set(cred.avatar_external_id, cred.avatar_id);
    });

    // Chamar API da HeyGen para obter quota
    const heygenResponse = await fetch("https://api.heygen.com/v2/user/remaining_quota", {
      method: "GET",
      headers: {
        "X-Api-Key": credentials.api_key,
        "Content-Type": "application/json",
      },
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error("Erro na API HeyGen:", heygenResponse.status, errorText);
      
      if (heygenResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: "A API key do Euvatar está inválida ou expirada",
          needsCredentialUpdate: true,
          euvatarCredits: 0,
          heygenCredits: 0,
          totalEuvatarCredits: 960,
          minutesRemaining: 0,
          totalMinutes: 240,
          hoursRemaining: 0,
          totalHours: 4,
          avatarUsage: [],
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Erro ao buscar créditos do Euvatar",
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heygenData = await heygenResponse.json();
    console.log("Resposta HeyGen quota:", JSON.stringify(heygenData));

    // Buscar histórico de sessões para calcular uso por avatar
    let avatarUsage: AvatarUsage[] = [];
    try {
      const sessionsResponse = await fetch("https://api.heygen.com/v2/streaming.list?page_size=100", {
        method: "GET",
        headers: {
          "X-Api-Key": credentials.api_key,
          "Content-Type": "application/json",
        },
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        console.log("Sessões encontradas:", sessionsData.data?.total || 0);

        // Agrupar uso por avatar_id
        const usageByAvatar = new Map<string, { seconds: number; count: number }>();
        
        const sessions: SessionData[] = sessionsData.data?.data || [];
        for (const session of sessions) {
          if (session.avatar_id && session.duration > 0) {
            const current = usageByAvatar.get(session.avatar_id) || { seconds: 0, count: 0 };
            current.seconds += session.duration;
            current.count += 1;
            usageByAvatar.set(session.avatar_id, current);
          }
        }

        // Converter para array de AvatarUsage
        avatarUsage = Array.from(usageByAvatar.entries()).map(([heygenAvatarId, usage]) => {
          const totalMinutes = Math.floor(usage.seconds / 60);
          // HeyGen: 1 crédito = 1 minuto de streaming
          const heygenCreditsUsed = totalMinutes;
          // Euvatar: 1 HeyGen credit = 20 Euvatar credits (porque 1 HeyGen = 5min mas aqui já é por minuto)
          // Na verdade: 1 minuto = 4 créditos euvatar (20 créditos / 5 minutos)
          const euvatarCreditsUsed = totalMinutes * 4;

          return {
            avatarId: avatarMapping.get(heygenAvatarId) || heygenAvatarId,
            heygenAvatarId,
            totalSeconds: usage.seconds,
            totalMinutes,
            heygenCredits: heygenCreditsUsed,
            euvatarCredits: euvatarCreditsUsed,
            sessionCount: usage.count,
          };
        });

        console.log("Uso por avatar:", JSON.stringify(avatarUsage));
      } else {
        console.error("Erro ao buscar sessões:", await sessionsResponse.text());
      }
    } catch (sessionError) {
      console.error("Erro ao processar sessões:", sessionError);
    }

    // Conversão:
    // - HeyGen quota / 60 = HeyGen credits
    // - 1 HeyGen credit = 5 minutos = 20 Euvatar credits
    const remainingQuota = heygenData.data?.remaining_quota ?? 0;
    const heygenCredits = remainingQuota / 60;
    const euvatarCredits = Math.floor(heygenCredits * 20);
    const minutesRemaining = Math.floor(heygenCredits * 5);
    const hoursRemaining = minutesRemaining / 60;

    // Total inicial: 960 Euvatar credits = 48 HeyGen credits = 4 horas
    const totalEuvatarCredits = 960;
    const totalMinutes = 240;
    const totalHours = 4;

    return new Response(JSON.stringify({
      euvatarCredits,
      heygenCredits: Math.floor(heygenCredits),
      totalEuvatarCredits,
      minutesRemaining,
      totalMinutes,
      hoursRemaining: parseFloat(hoursRemaining.toFixed(2)),
      totalHours,
      usedEuvatarCredits: totalEuvatarCredits - euvatarCredits,
      usedMinutes: totalMinutes - minutesRemaining,
      percentageRemaining: Math.round((euvatarCredits / totalEuvatarCredits) * 100),
      avatarUsage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
