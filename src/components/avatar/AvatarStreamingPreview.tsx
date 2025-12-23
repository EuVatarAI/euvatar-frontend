import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Send, Loader2, AlertCircle, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarButton {
  id: string;
  label: string;
  action_type: string;
  color: string;
  position_x: number;
  position_y: number;
  border_style: 'square' | 'rounded' | 'pill';
  font_family: string;
  font_size: number;
  enabled: boolean;
}

interface Ad {
  id: string;
  media_url: string;
  duration: number;
  display_order: number;
}

interface AvatarStreamingPreviewProps {
  avatarId: string;
  hasCredentials: boolean;
  avatarOrientation?: string | null;
  backstory?: string;
  language?: string;
}

const BORDER_CONFIG = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || '';
const apiToken = (import.meta.env.VITE_APP_API_TOKEN as string | undefined) || '';

function buildBackendUrl(path: string) {
  if (!backendUrl) return '';
  const base = backendUrl.replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

export function AvatarStreamingPreview({ 
  avatarId, 
  hasCredentials,
  avatarOrientation,
  backstory,
  language
}: AvatarStreamingPreviewProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [buttons, setButtons] = useState<AvatarButton[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const isVertical = avatarOrientation !== 'horizontal';
  const clientId = `avatar-preview:${avatarId}`;

  const attachStreamToVideo = useCallback(() => {
    if (!videoRef.current || !mediaStreamRef.current) return;
    videoRef.current.srcObject = mediaStreamRef.current;
    videoRef.current.muted = false;
    videoRef.current.volume = 1;
    videoRef.current.play().catch(() => {
      // alguns browsers bloqueiam autoplay com áudio; usuário já clicou no botão
    });
  }, []);

  // Fetch buttons and ads
  useEffect(() => {
    const fetchData = async () => {
      const [buttonsRes, adsRes] = await Promise.all([
        supabase
          .from('avatar_buttons')
          .select('*')
          .eq('avatar_id', avatarId)
          .eq('enabled', true)
          .order('display_order'),
        supabase
          .from('avatar_ads')
          .select('*')
          .eq('avatar_id', avatarId)
          .order('display_order'),
      ]);

      if (buttonsRes.data) setButtons(buttonsRes.data as AvatarButton[]);
      if (adsRes.data) setAds(adsRes.data as Ad[]);
    };

    fetchData();
  }, [avatarId]);

  // Handle ad video ended - play next
  const handleAdEnded = useCallback(() => {
    if (ads.length > 0) {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }
  }, [ads.length]);

  // Create and start streaming session
  const startStreaming = async () => {
    if (isConnecting) return; // evita múltiplos cliques
    if (!hasCredentials) {
      toast({
        title: 'Credenciais necessárias',
        description: 'Configure as credenciais do Euvatar primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    try {
      if (!backendUrl) {
        throw new Error('VITE_BACKEND_URL não configurada');
      }
      // pequena proteção para não criar sessão se já estiver conectando
      if (isConnected) {
        console.log('Já conectado, ignore start');
        return;
      }
      // Create session (backend already starts HeyGen session)
      const params = new URLSearchParams();
      params.set('avatar_id', avatarId);
      if (language) params.set('language', language);
      if (backstory) params.set('backstory', backstory);
      const createUrl = buildBackendUrl(`/new?${params.toString()}`);
      const createResp = await fetch(createUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
      });
      const createData = await createResp.json();
      if (!createResp.ok || !createData?.ok) {
        throw new Error(createData?.error || 'Erro ao criar sessão');
      }

      const session = {
        session_id: createData.session_id,
        url: createData.livekit_url,
        access_token: createData.access_token,
      };
      setSessionId(session.session_id);

      console.log('Session created:', session.session_id, session.url);

      // Connect to LiveKit room
      const room = new Room();
      roomRef.current = room;
      mediaStreamRef.current = new MediaStream();

      room.on(RoomEvent.TrackSubscribed, (track) => {
        console.log('Track subscribed:', track.kind, track.sid);
        if (track.kind === 'video' || track.kind === 'audio') {
          const mediaTrack = track.mediaStreamTrack;
          mediaStreamRef.current?.addTrack(mediaTrack);
          if (track.kind === 'video') {
            attachStreamToVideo();
            setIsStreaming(true);
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === 'video') {
          setIsStreaming(false);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Room disconnected');
        setIsConnected(false);
        setIsStreaming(false);
      });

      setIsStreaming(false);
      await room.connect(session.url, session.access_token);
      console.log('Connected to LiveKit room');

      setIsConnected(true);
      toast({
        title: 'Conectado!',
        description: 'Streaming do avatar iniciado.',
      });

    } catch (error: any) {
      console.error('Error starting streaming:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao iniciar streaming',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Stop streaming session
  const stopStreaming = async () => {
    try {
      if (sessionId) {
        const interruptUrl = buildBackendUrl('/interrupt');
        if (interruptUrl) {
          await fetch(interruptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': clientId,
              ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
        }
      }
      const endUrl = buildBackendUrl('/end');
      if (endUrl) {
        await fetch(endUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': clientId,
            ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
          },
        });
      }

      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      mediaStreamRef.current = null;
      setSessionId(null);
      setIsConnected(false);
      setIsStreaming(false);

      // pequena pausa antes de permitir nova sessão
      await new Promise(res => setTimeout(res, 1000));

      toast({
        title: 'Desconectado',
        description: 'Streaming encerrado.',
      });

    } catch (error) {
      console.error('Error stopping streaming:', error);
    }
  };

  // Send text to avatar
  const sendText = async () => {
    if (!inputText.trim() || !sessionId) return;

    setIsSending(true);
    try {
      if (!backendUrl) {
        throw new Error('VITE_BACKEND_URL não configurada');
      }
      const sayUrl = buildBackendUrl('/say');
      const sayResp = await fetch(sayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          text: inputText,
          avatar_id: avatarId,
        }),
      });
      const sayData = await sayResp.json();
      if (!sayResp.ok || !sayData?.ok) {
        throw new Error(sayData?.error || 'Erro ao enviar texto');
      }

      setInputText('');
    } catch (error: any) {
      console.error('Error sending text:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar texto para o avatar',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const renderButton = (button: AvatarButton) => {
    const borderClass = BORDER_CONFIG[button.border_style] || 'rounded-lg';
    const paddingX = Math.max(12, Math.round(button.font_size * 0.8));
    const paddingY = Math.max(6, Math.round(button.font_size * 0.4));

    return (
      <button
        key={button.id}
        className={`font-medium transition-all shadow-lg ${borderClass} pointer-events-none`}
        style={{
          backgroundColor: button.color,
          color: 'white',
          fontFamily: button.font_family,
          fontSize: `${button.font_size}px`,
          padding: `${paddingY}px ${paddingX}px`,
          position: 'absolute',
          left: `${button.position_x}%`,
          top: `${button.position_y}%`,
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {button.label}
      </button>
    );
  };

  const currentAdUrl = ads.length > 0 ? ads[currentAdIndex]?.media_url : null;

    return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div 
        className="relative bg-black rounded-lg overflow-hidden mx-auto"
        style={{
          aspectRatio: isVertical ? '9/16' : '16/9',
          maxHeight: isVertical ? '600px' : '450px',
        }}
      >
        {/* Streaming Video (sempre montado para evitar race com track) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
            isConnected && isStreaming ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Idle/Ads Video - shows when not streaming */}
        {!isStreaming && (
          <>
            {currentAdUrl ? (
              <video
                key={`ad-${currentAdIndex}`}
                ref={idleVideoRef}
                src={currentAdUrl}
                autoPlay
                loop={ads.length === 1}
                muted
                playsInline
                onEnded={ads.length > 1 ? handleAdEnded : undefined}
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum vídeo idle configurado</p>
                  <p className="text-xs opacity-70">Simulação</p>
                </div>
              </div>
            )}
            {/* Simulação watermark when showing sample */}
            {!currentAdUrl && (
              <div className="absolute top-2 left-2 bg-black/50 text-white/70 text-xs px-2 py-1 rounded">
                Simulação
              </div>
            )}
          </>
        )}

        {/* Buttons overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {buttons.map(renderButton)}
        </div>

        {/* Connection status indicator */}
        {isConnected && isStreaming && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Ao Vivo
          </div>
        )}

        {/* Connecting overlay */}
        {isConnecting && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Conectando ao avatar...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {!hasCredentials ? (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Configure as credenciais do Euvatar na aba Credenciais para testar o preview interativo.
            </p>
          </div>
        ) : (
          <>
            {/* Start/Stop Button */}
            <div className="flex gap-2">
              {!isConnected ? (
                <Button 
                  onClick={startStreaming} 
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isConnecting ? 'Conectando...' : 'Iniciar Preview'}
                </Button>
              ) : (
                <Button 
                  onClick={stopStreaming} 
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Parar Preview
                </Button>
              )}
            </div>

            {/* Text input - only when connected */}
            {isConnected && (
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite algo para o avatar falar..."
                  onKeyDown={(e) => e.key === 'Enter' && sendText()}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendText} 
                  disabled={isSending || !inputText.trim()}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
