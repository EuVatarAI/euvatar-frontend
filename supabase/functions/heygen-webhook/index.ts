import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-heygen-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // HeyGen webhook event types:
    // - session.started
    // - session.ended
    // - message.received
    // - message.sent
    
    const eventType = payload.event || payload.type;
    const data = payload.data || payload;

    if (eventType === 'session.started' || eventType === 'streaming.started') {
      // Session started - create new record
      const sessionId = data.session_id || data.id;
      const avatarExternalId = data.avatar_id || data.streaming_avatar_id;

      console.log(`Session started: ${sessionId} for avatar: ${avatarExternalId}`);

      // Find our internal avatar by external ID
      const { data: credentials } = await supabase
        .from('avatar_credentials')
        .select('avatar_id')
        .eq('avatar_external_id', avatarExternalId)
        .maybeSingle();

      if (credentials?.avatar_id) {
        const { error: insertError } = await supabase
          .from('avatar_sessions')
          .insert({
            avatar_id: credentials.avatar_id,
            session_id: sessionId,
            started_at: new Date().toISOString(),
            platform: data.platform || 'web',
            user_agent: req.headers.get('user-agent') || null,
            metadata: {
              raw_event: payload
            }
          });

        if (insertError) {
          console.error('Error inserting session:', insertError);
        } else {
          console.log('Session record created successfully');
        }
      } else {
        console.log('Avatar not found for external ID:', avatarExternalId);
      }
    } 
    else if (eventType === 'session.ended' || eventType === 'streaming.ended') {
      // Session ended - update record
      const sessionId = data.session_id || data.id;
      const duration = data.duration || data.duration_seconds || 0;
      const topics = data.topics || [];
      const summary = data.summary || null;

      console.log(`Session ended: ${sessionId}, duration: ${duration}s`);

      const { error: updateError } = await supabase
        .from('avatar_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          topics: topics,
          summary: summary,
          metadata: {
            raw_event: payload
          }
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
      } else {
        console.log('Session record updated successfully');
      }
    }
    else if (eventType === 'message.received' || eventType === 'message.sent') {
      // Message event - increment message count and potentially extract topics
      const sessionId = data.session_id;
      
      if (sessionId) {
        // Get current session
        const { data: session } = await supabase
          .from('avatar_sessions')
          .select('messages_count, topics')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (session) {
          const newCount = (session.messages_count || 0) + 1;
          const currentTopics = session.topics || [];
          
          // Extract potential topics from message (simple keyword extraction)
          const messageContent = data.content || data.text || '';
          const newTopics = extractTopics(messageContent, currentTopics);

          await supabase
            .from('avatar_sessions')
            .update({
              messages_count: newCount,
              topics: newTopics
            })
            .eq('session_id', sessionId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Simple topic extraction from message content
function extractTopics(content: string, existingTopics: string[]): string[] {
  // Common topic keywords to look for
  const topicKeywords = [
    'produto', 'preço', 'entrega', 'pagamento', 'suporte', 'ajuda',
    'dúvida', 'problema', 'compra', 'venda', 'serviço', 'atendimento',
    'reclamação', 'elogio', 'informação', 'contato', 'horário', 'localização'
  ];
  
  const lowerContent = content.toLowerCase();
  const foundTopics = topicKeywords.filter(keyword => 
    lowerContent.includes(keyword) && !existingTopics.includes(keyword)
  );
  
  return [...existingTopics, ...foundTopics].slice(0, 10); // Max 10 topics
}
