import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatar_id, user_message } = await req.json();

    if (!avatar_id || !user_message) {
      return new Response(
        JSON.stringify({ error: "avatar_id and user_message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all enabled media triggers with description for this avatar
    const { data: triggers, error: triggerError } = await supabase
      .from("media_triggers")
      .select("trigger_phrase, description, keywords_text, media_url")
      .eq("avatar_id", avatar_id);

    if (triggerError || !triggers || triggers.length === 0) {
      return new Response(
        JSON.stringify({ context_name: "none" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try LLM-based matching first
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (lovableApiKey) {
      try {
        const triggerList = triggers
          .filter(t => t.description) // Only triggers with description
          .map((c) => ({
            name: c.trigger_phrase,
            description: c.description,
          }));

        const prompt = `Você recebe:
- Pergunta do usuário: "${user_message}"
- Lista de contextos: ${JSON.stringify(triggerList)}

Escolha no máximo 1 contexto cujo description melhor se aplica à pergunta.
Responda APENAS com o name do contexto ou "none". Nada mais.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um assistente que identifica contextos relevantes." },
              { role: "user", content: prompt },
            ],
            max_completion_tokens: 50,
          }),
        });

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim() || "none";
        
        console.log("LLM match result:", answer);

        return new Response(
          JSON.stringify({ context_name: answer }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (llmError) {
        console.error("LLM matching failed:", llmError);
        // Fall through to keyword fallback
      }
    }

    // Fallback: simple keyword matching
    const userLower = user_message.toLowerCase();
    for (const trigger of triggers) {
      if (!trigger.keywords_text) continue;
      const keywords = trigger.keywords_text.split(/\s+/);
      const matchCount = keywords.filter((kw: string) => userLower.includes(kw)).length;
      if (matchCount >= 2) {
        console.log("Keyword match:", trigger.trigger_phrase);
        return new Response(
          JSON.stringify({ context_name: trigger.trigger_phrase, media_url: trigger.media_url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ context_name: "none" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in match-context:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
