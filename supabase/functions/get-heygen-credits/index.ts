import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Buscar credenciais do primeiro avatar do usuário (todas compartilham a mesma API key)
    const { data: credentials, error: credError } = await supabaseClient
      .from("avatar_credentials")
      .select("api_key, avatar_id")
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
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      
      // Se for 401, a API key está inválida
      if (heygenResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: "API key da HeyGen inválida ou expirada",
          needsCredentialUpdate: true,
          euvatarCredits: 0,
          heygenCredits: 0,
          totalEuvatarCredits: 960,
          minutesRemaining: 0,
          totalMinutes: 240,
          hoursRemaining: 0,
          totalHours: 4,
        }), {
          status: 200, // Retorna 200 para o frontend tratar como estado conhecido
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Erro ao buscar créditos da HeyGen",
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heygenData = await heygenResponse.json();
    console.log("Resposta HeyGen:", JSON.stringify(heygenData));

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
