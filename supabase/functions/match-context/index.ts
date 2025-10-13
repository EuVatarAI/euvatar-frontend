import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatar_id, question } = await req.json();

    if (!avatar_id || !question) {
      return new Response(
        JSON.stringify({ error: "avatar_id and question are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar contextos ativos do avatar
    const { data: contexts, error: contextError } = await supabase
      .from('contexts')
      .select('*')
      .eq('avatar_id', avatar_id)
      .eq('enabled', true);

    if (contextError) {
      console.error("Error fetching contexts:", contextError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch contexts" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contexts || contexts.length === 0) {
      return new Response(
        JSON.stringify({ matched_context: null, message: "No active contexts found" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar LLM matching primeiro
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let matchedContext = null;

    if (LOVABLE_API_KEY) {
      try {
        const contextList = contexts.map(c => ({
          name: c.name,
          description: c.description
        }));

        const prompt = `Você recebe:
- Pergunta do usuário: "${question}"
- Lista de contextos: ${JSON.stringify(contextList)}

Escolha no máximo 1 contexto cujo description melhor se aplica à pergunta.
Responda APENAS com o name do contexto ou "none".
Não adicione explicações ou formatação extra.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: 50
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiAnswer = data.choices?.[0]?.message?.content?.trim() || "none";
          
          if (aiAnswer !== "none") {
            // Verificar se o contexto retornado existe
            const foundContext = contexts.find(c => c.name === aiAnswer);
            if (foundContext) {
              matchedContext = foundContext.name;
            }
          }
        }
      } catch (error) {
        console.error("LLM matching failed, falling back to keyword matching:", error);
      }
    }

    // Fallback: keyword matching
    if (!matchedContext) {
      const questionLower = question.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      for (const context of contexts) {
        const keywords = context.keywords_text || "";
        const words = keywords.split(/\s+/);
        
        // Verifica se pelo menos 2 palavras do contexto aparecem na pergunta
        const matches = words.filter((word: string) => 
          word.length > 3 && questionLower.includes(word)
        );
        
        if (matches.length >= 2) {
          matchedContext = context.name;
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        matched_context: matchedContext,
        method: matchedContext ? (LOVABLE_API_KEY ? "llm" : "keyword") : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in match-context function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
