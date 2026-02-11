import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScaledIframe } from '@/components/ScaledIframe';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, AlertCircle, Maximize, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Room, RoomEvent, createLocalAudioTrack, LocalAudioTrack } from 'livekit-client';

interface AvatarButton {
  id: string;
  label: string;
  action_type: 'session_start' | 'video_upload' | 'external_link';
  external_url: string | null;
  video_url: string | null;
  color: string;
  position_x: number;
  position_y: number;
  border_style: 'square' | 'rounded' | 'pill';
  font_family: string;
  font_size: number;
  enabled: boolean;
}

interface AvatarAd {
  id: string;
  media_url: string;
  duration: number;
  display_order: number;
}

interface Avatar {
  id: string;
  name: string;
  idle_media_url: string | null;
  cover_image_url: string | null;
  avatar_orientation: string | null;
  backstory: string | null;
  language: string | null;
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const COUNTDOWN_SECONDS = 10;
const PUBLIC_SESSION_MIN = 2.5;
const WARN_SECONDS = 10;

const BORDER_CONFIG = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || '';
const avatarProvider = (import.meta.env.VITE_AVATAR_PROVIDER as string | undefined) || 'heygen';
const isLiveAvatar = avatarProvider.toLowerCase() === 'liveavatar';
const STATIC_ASSETS = {
  talk: '/estatic/fale%20comigo.png',
  micBase: '/estatic/bot%C3%A3o%20limpo.png',
  end: '/estatic/encerrar.png',
  continue: '/estatic/continuar.png',
  endAlt: '/estatic/a.png',
};

function buildBackendUrl(path: string) {
  if (!backendUrl) return '';
  const base = backendUrl.replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const getPadding = (fontSize: number) => {
  const paddingX = Math.max(12, Math.round(fontSize * 0.8));
  const paddingY = Math.max(6, Math.round(fontSize * 0.4));
  return { paddingX, paddingY };
};

export default function EuvatarPublic() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [buttons, setButtons] = useState<AvatarButton[]>([]);
  const [ads, setAds] = useState<AvatarAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Popup states
  const [externalPopupOpen, setExternalPopupOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [buttonVideoUrl, setButtonVideoUrl] = useState<string | null>(null);
  const [contextMedia, setContextMedia] = useState<{ type: 'image' | 'video'; url: string; caption?: string } | null>(null);

  // Live session states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showSessionExtendDialog, setShowSessionExtendDialog] = useState(false);
  
  // Inactivity states
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionWarnShownRef = useRef(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const agentRoomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const liveRecordChunksRef = useRef<Blob[]>([]);
  const contextMediaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAvatarTextRef = useRef<string>('');

  // Determine aspect ratio based on orientation
  const isVertical = avatar?.avatar_orientation === 'vertical';
  const aspectRatio = isVertical ? '9 / 16' : '16 / 9';
  const maxWidth = isVertical
    ? 'min(100vw, calc(100vh * 9 / 16))'
    : 'min(100vw, calc(100vh * 16 / 9))';
  const maxHeight = isVertical
    ? 'min(100vh, calc(100vw * 16 / 9))'
    : 'min(100vh, calc(100vw * 9 / 16))';
  const clientId = (() => {
    if (!id) return 'public:unknown';
    const key = 'euvatar_client_id_public';
    let stored = '';
    try {
      stored = window.localStorage.getItem(key) || '';
      if (!stored) {
        stored = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        window.localStorage.setItem(key, stored);
      }
    } catch {
      stored = `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    }
    return `public:${id}:${stored}`;
  })();
  const isHolidayAvatar = /papai|noel|santa/i.test(avatar?.name || '');
  const useCornerChat = isHolidayAvatar && !isVertical;

  const showContextMedia = useCallback((media: { type: 'image' | 'video'; url: string; caption?: string }) => {
    setContextMedia(media);
    if (contextMediaTimerRef.current) {
      clearTimeout(contextMediaTimerRef.current);
      contextMediaTimerRef.current = null;
    }
    if (media.type === 'image') {
      contextMediaTimerRef.current = setTimeout(() => {
        setContextMedia(null);
      }, 12000);
    }
  }, []);

  const formatTimer = (sec: number) => {
    const clamped = Math.max(0, sec);
    const m = String(Math.floor(clamped / 60)).padStart(2, '0');
    const s = String(clamped % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const clearSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const startSessionTimer = (minutes: number) => {
    const totalSeconds = Math.max(1, Math.round(minutes * 60));
    const endAt = Date.now() + totalSeconds * 1000;
    setSessionTotalSeconds(totalSeconds);
    setSessionSecondsLeft(totalSeconds);
    setShowSessionWarning(false);
    setShowSessionExtendDialog(false);
    sessionWarnShownRef.current = false;
    clearSessionTimer();
    sessionTimerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSessionSecondsLeft(left);
      if (left <= WARN_SECONDS && left > 0) {
        setShowSessionWarning(true);
        if (!sessionWarnShownRef.current) {
          sessionWarnShownRef.current = true;
          setShowSessionExtendDialog(true);
        }
      } else if (left > WARN_SECONDS) {
        setShowSessionWarning(false);
      }
      if (left <= 0) {
        clearSessionTimer();
        setShowSessionWarning(false);
        setShowSessionExtendDialog(false);
        endSession();
      }
    }, 1000);
  };

  const handleSessionContinue = () => {
    setShowSessionExtendDialog(false);
    startSessionTimer(PUBLIC_SESSION_MIN);
  };

  const buildAuthHeaders = useCallback(() => {
    if (authToken) {
      return { Authorization: `Bearer ${authToken}` };
    }
    if (id) {
      return { 'X-Public-Avatar-Id': id };
    }
    return {};
  }, [authToken, id]);

  const resolveContextMedia = useCallback(async (text: string) => {
    if (!backendUrl || !id || !text.trim()) return;
    try {
      const resp = await fetch(buildBackendUrl('/context/resolve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ avatar_id: id, text }),
      });
      const data = await resp.json();
      const mediaRaw = data?.media || (data?.media_url ? {
        url: data.media_url,
        type: data.media_type,
        caption: data.caption || data.name,
      } : null);
      const mediaUrl = mediaRaw?.url;
      if (resp.ok && data?.ok && mediaUrl) {
        const mediaType = mediaRaw?.type || mediaRaw?.media_type || (isVideoUrl(mediaUrl) ? 'video' : 'image');
        showContextMedia({
          type: mediaType,
          url: mediaUrl,
          caption: mediaRaw?.caption,
        });
      }
    } catch (err) {
      console.error('Context resolve error:', err);
    }
  }, [buildAuthHeaders, id, showContextMedia]);

  const resolveAvatarSpeech = useCallback(async (rawText: string) => {
    const cleaned = (rawText || '').trim();
    if (!cleaned) return;
    if (lastAvatarTextRef.current === cleaned) return;
    lastAvatarTextRef.current = cleaned;
    await resolveContextMedia(cleaned);
  }, [resolveContextMedia]);

  const extractAvatarText = useCallback((payload: Uint8Array | string) => {
    let text = '';
    try {
      text = typeof payload === 'string'
        ? payload
        : new TextDecoder().decode(payload);
    } catch {
      return '';
    }
    const trimmed = (text || '').trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed;
      if (parsed?.text) return String(parsed.text);
      if (parsed?.transcript) return String(parsed.transcript);
      if (parsed?.message) return String(parsed.message);
      if (parsed?.content) return String(parsed.content);
      if (parsed?.utterance) return String(parsed.utterance);
      if (parsed?.data?.text) return String(parsed.data.text);
    } catch {
      // not JSON, keep raw
    }
    return trimmed;
  }, []);

  const attachTrackToVideo = useCallback((track: any) => {
    if (!liveVideoRef.current) return;
    track.attach(liveVideoRef.current);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;500;600;700&family=Lato:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    fetchData();
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      clearInactivityTimer();
      clearCountdownTimer();
      if (contextMediaTimerRef.current) {
        clearTimeout(contextMediaTimerRef.current);
        contextMediaTimerRef.current = null;
      }
      clearSessionTimer();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (agentRoomRef.current) {
        agentRoomRef.current.disconnect();
        agentRoomRef.current = null;
      }
      if (audioElsRef.current.length) {
        audioElsRef.current.forEach((el) => {
          try {
            el.remove();
          } catch {
            // ignore
          }
        });
        audioElsRef.current = [];
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch avatar data
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('id, name, idle_media_url, cover_image_url, avatar_orientation, backstory, language')
        .eq('id', id)
        .single();

      if (avatarError) throw avatarError;
      setAvatar(avatarData);

      // Fetch buttons
      const { data: buttonsData, error: buttonsError } = await supabase
        .from('avatar_buttons')
        .select('*')
        .eq('avatar_id', id)
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      if (buttonsError) throw buttonsError;
      setButtons((buttonsData || []) as AvatarButton[]);

      // Fetch ads
      const { data: adsData, error: adsError } = await supabase
        .from('avatar_ads')
        .select('*')
        .eq('avatar_id', id)
        .order('display_order', { ascending: true });

      if (!adsError && adsData && adsData.length > 0) {
        setAds(adsData as AvatarAd[]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Euvatar não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const enterFullscreen = async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Error entering fullscreen:', err);
      toast({
        title: 'Fullscreen não disponível',
        description: 'Seu navegador não suporta modo tela cheia ou foi bloqueado.',
        variant: 'destructive',
      });
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Error exiting fullscreen:', err);
    }
  };

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    clearCountdownTimer();
    setShowInactivityWarning(false);
    setCountdown(COUNTDOWN_SECONDS);
    
    if (externalPopupOpen || buttonVideoUrl) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
        startCountdown();
      }, INACTIVITY_TIMEOUT);
    }
  }, [externalPopupOpen, buttonVideoUrl]);

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECONDS);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleInactivityTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInactivityTimeout = () => {
    clearCountdownTimer();
    setShowInactivityWarning(false);
    closeAllPopups();
    endSession();
  };

  const handleContinueSession = () => {
    setShowInactivityWarning(false);
    clearCountdownTimer();
    resetInactivityTimer();
  };

  const closeAllPopups = () => {
    setExternalPopupOpen(false);
    setExternalUrl('');
    setButtonVideoUrl(null);
    setContextMedia(null);
    clearInactivityTimer();
    clearCountdownTimer();
    setShowInactivityWarning(false);
  };

  useEffect(() => {
    const handleActivity = () => {
      if (externalPopupOpen || buttonVideoUrl) {
        resetInactivityTimer();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [externalPopupOpen, buttonVideoUrl, resetInactivityTimer]);

  useEffect(() => {
    if (externalPopupOpen || buttonVideoUrl) {
      resetInactivityTimer();
    } else {
      clearInactivityTimer();
      clearCountdownTimer();
      setShowInactivityWarning(false);
    }
  }, [externalPopupOpen, buttonVideoUrl, resetInactivityTimer]);

  // Handle ad advancement
  const handleAdEnded = () => {
    if (ads.length > 0) {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }
  };

  const handleButtonClick = (button: AvatarButton) => {
    switch (button.action_type) {
      case 'session_start':
        handleSessionStart();
        break;
      case 'video_upload':
        if (button.video_url) {
          setButtonVideoUrl(button.video_url);
        }
        break;
      case 'external_link':
        if (button.external_url) {
          setExternalUrl(button.external_url);
          setExternalPopupOpen(true);
        }
        break;
    }
  };

  const handleSessionStart = () => {
    if (isConnecting || isConnected) return;
    if (!backendUrl) {
      toast({
        title: 'Backend não configurado',
        description: 'Defina VITE_BACKEND_URL para iniciar a sessão.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    toast({
      title: 'Iniciando sessão...',
      description: 'Conectando ao avatar interativo.',
    });

    const start = async () => {
      try {
        const params = new URLSearchParams();
        if (id) params.set('avatar_id', id);
        if (avatar?.language) params.set('language', avatar.language);
        if (avatar?.backstory) params.set('backstory', avatar.backstory);
        if (isHolidayAvatar) params.set('quality', 'high');
        params.set('minutes', String(PUBLIC_SESSION_MIN));
        params.set('client_id', clientId);
        const createUrl = buildBackendUrl(`/new?${params.toString()}`);
        const resp = await fetch(createUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(),
          },
        });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || 'Erro ao criar sessão');
        }

        setSessionId(data.session_id);

        const room = new Room();
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video') {
            attachTrackToVideo(track);
            setIsStreaming(true);
            return;
          }
          if (track.kind === 'audio') {
            const a = document.createElement('audio');
            a.autoplay = true;
            a.playsInline = true;
            a.muted = false;
            a.volume = 1;
            track.attach(a);
            try {
              a.play().catch(() => undefined);
            } catch {
              // ignore
            }
            document.body.appendChild(a);
            audioElsRef.current.push(a);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === 'video') {
            setIsStreaming(false);
            return;
          }
        });

        room.on(RoomEvent.DataReceived, (payload, participant) => {
          if (participant?.isLocal) return;
          const text = extractAvatarText(payload);
          if (text) {
            resolveAvatarSpeech(text);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setIsStreaming(false);
        });

        setIsStreaming(false);
        await room.connect(data.livekit_url, data.access_token);

        if (data.livekit_agent_token) {
          const agentRoom = new Room();
          agentRoomRef.current = agentRoom;
          agentRoom.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === 'audio') {
              const a = document.createElement('audio');
              a.autoplay = true;
              a.playsInline = true;
              a.muted = false;
              a.volume = 1;
              track.attach(a);
              try {
                a.play().catch(() => undefined);
              } catch {
                // ignore
              }
              document.body.appendChild(a);
              audioElsRef.current.push(a);
            }
          });
          agentRoom.on(RoomEvent.Disconnected, () => {
            if (agentRoomRef.current) {
              agentRoomRef.current = null;
            }
          });
          await agentRoom.connect(data.livekit_url, data.livekit_agent_token);
        }
        setIsConnected(true);
        startSessionTimer(PUBLIC_SESSION_MIN);
      } catch (err: any) {
        console.error('Error starting session:', err);
        toast({
          title: 'Erro ao iniciar',
          description: err?.message || 'Erro ao iniciar sessão',
          variant: 'destructive',
        });
      } finally {
        setIsConnecting(false);
      }
    };

    start();
  };

  const endSession = async () => {
    try {
      if (!backendUrl) return;
      if (sessionId) {
        const interruptUrl = buildBackendUrl('/interrupt');
        await fetch(interruptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
      }

      const endUrl = buildBackendUrl('/end');
      await fetch(endUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (err) {
      console.error('Error ending session:', err);
    } finally {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (agentRoomRef.current) {
        agentRoomRef.current.disconnect();
        agentRoomRef.current = null;
      }
      setSessionId(null);
      setIsConnected(false);
      setIsStreaming(false);
      setIsRecording(false);
      clearSessionTimer();
      setSessionSecondsLeft(0);
      setShowSessionWarning(false);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
      }
      if (audioElsRef.current.length) {
        audioElsRef.current.forEach((el) => {
          try {
            el.remove();
          } catch {
            // ignore
          }
        });
        audioElsRef.current = [];
      }
      recorderRef.current = null;
      recordChunksRef.current = [];
    }
  };

  const sendText = async (textOverride?: string) => {
    if (isLiveAvatar) {
      toast({
        title: 'Modo voz',
        description: 'Envio de texto não disponível.',
      });
      return;
    }
    const text = (textOverride ?? inputText).trim();
    if (!text) return;
    if (!sessionId) {
      toast({
        title: 'Sessão não iniciada',
        description: 'Clique em "Fale comigo" para iniciar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const sayUrl = buildBackendUrl('/say');
      const sayResp = await fetch(sayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          text,
          avatar_id: id,
          client_id: clientId,
        }),
      });
      const sayData = await sayResp.json();
      if (!sayResp.ok || !sayData?.ok) {
        throw new Error(sayData?.error || 'Erro ao enviar texto');
      }
      const sayMedia = sayData?.media || (sayData?.media_url ? {
        url: sayData.media_url,
        type: sayData.media_type,
        caption: sayData.caption || sayData.name,
      } : null);
      if (sayMedia?.url) {
        const mediaType = sayMedia?.type || sayMedia?.media_type || (isVideoUrl(sayMedia.url) ? 'video' : 'image');
        showContextMedia({
          type: mediaType,
          url: sayMedia.url,
          caption: sayMedia.caption,
        });
      }
      setInputText('');
    } catch (error: any) {
      console.error('Error sending text:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar texto',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    if (!sessionId) {
      toast({
        title: 'Sessão não iniciada',
        description: 'Clique em "Fale comigo" para iniciar.',
        variant: 'destructive',
      });
      return;
    }
    try {
      if (isLiveAvatar) {
        if (!roomRef.current) {
          throw new Error('Sala LiveKit não conectada.');
        }
        if (localAudioTrackRef.current) {
          return;
        }
        const track = await createLocalAudioTrack();
        await roomRef.current.localParticipant.publishTrack(track);
        localAudioTrackRef.current = track;
        try {
          const stream = new MediaStream([track.mediaStreamTrack]);
          const recorder = new MediaRecorder(stream);
          liveRecorderRef.current = recorder;
          liveRecordChunksRef.current = [];
          recorder.ondataavailable = (event) => {
            if (event.data?.size) {
              liveRecordChunksRef.current.push(event.data);
            }
          };
          recorder.onstop = async () => {
            try {
              const blob = new Blob(liveRecordChunksRef.current, { type: 'audio/webm' });
              const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
              const form = new FormData();
              form.append('audio', file);
              const sttUrl = buildBackendUrl('/stt');
              const resp = await fetch(sttUrl, {
                method: 'POST',
                headers: {
                  ...buildAuthHeaders(),
                },
                body: form,
              });
              const data = await resp.json();
              if (resp.ok && data?.ok && data?.text) {
                await resolveContextMedia(data.text);
              }
            } catch (err) {
              console.error('STT (liveavatar) error:', err);
            }
          };
          recorder.start();
        } catch (err) {
          console.error('Liveavatar recorder error:', err);
        }
        setIsRecording(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
          const form = new FormData();
          form.append('audio', file);
          const sttUrl = buildBackendUrl('/stt');
          const resp = await fetch(sttUrl, {
            method: 'POST',
            headers: {
              ...buildAuthHeaders(),
            },
            body: form,
          });
          const data = await resp.json();
          if (!resp.ok || !data?.ok) {
            throw new Error(data?.error || 'Erro ao transcrever áudio');
          }
          if (data.text) {
            if (isLiveAvatar) {
              toast({
                title: 'Modo voz',
                description: 'Envio de texto não disponível.',
              });
            } else {
              await sendText(data.text);
            }
          }
        } catch (err) {
          console.error('STT error:', err);
          toast({
            title: 'Erro',
            description: 'Erro ao transcrever áudio.',
            variant: 'destructive',
          });
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      toast({
        title: 'Microfone bloqueado',
        description: 'Permita o acesso ao microfone para falar.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (isLiveAvatar && localAudioTrackRef.current) {
      const track = localAudioTrackRef.current;
      if (liveRecorderRef.current && liveRecorderRef.current.state !== 'inactive') {
        liveRecorderRef.current.stop();
      }
      try {
        roomRef.current?.localParticipant.unpublishTrack(track);
      } catch {
        // ignore
      }
      track.stop();
      localAudioTrackRef.current = null;
      setIsRecording(false);
      return;
    }
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleButtonVideoEnd = () => {
    setButtonVideoUrl(null);
  };

  const renderButton = (button: AvatarButton) => {
    if (isConnected) {
      return null;
    }
    const borderConfig = BORDER_CONFIG[button.border_style];
    const { paddingX, paddingY } = getPadding(button.font_size);

    return (
      <button
        key={button.id}
        onClick={() => handleButtonClick(button)}
        className={`font-medium transition-all shadow-lg hover:scale-105 active:scale-95 ${borderConfig}`}
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
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {button.label}
      </button>
    );
  };

  // Get current media URL (ads playlist or idle)
  const currentMediaUrl = ads.length > 0 ? ads[currentAdIndex]?.media_url : (avatar?.idle_media_url || avatar?.cover_image_url);
  const isVideoUrl = (url?: string | null) => !!url && /\.(mp4|webm|mov|m4v)$/i.test(url);
  const controlsClass = `absolute inset-x-0 ${isVertical ? 'bottom-10 px-6' : 'bottom-4 px-4'} flex items-center justify-between pointer-events-none`;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>{error || 'Euvatar não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 overflow-hidden"
    >
      {/* Fullscreen button - only show when not in fullscreen */}
      {!isFullscreen && (
        <Button
          onClick={enterFullscreen}
          variant="secondary"
          size="lg"
          className="fixed top-4 right-4 z-50 gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          <Maximize className="h-5 w-5" />
          Entrar em Tela Cheia
        </Button>
      )}

      {/* Main experience container - maintains aspect ratio */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: maxWidth, height: maxHeight, minWidth: 0, minHeight: 0 }}
      >
        <div
          className="relative bg-black"
          style={{
            aspectRatio,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Live Video (always mounted) */}
          <video
            ref={liveVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
              isConnected && isStreaming ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Session timer (top) */}
          {isConnected && sessionTotalSeconds > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white shadow ring-1 ring-white/10">
              ⏳ {formatTimer(sessionSecondsLeft)} / {formatTimer(sessionTotalSeconds)}
            </div>
          )}

          {/* Idle/Ads Video */}
          {!isStreaming && (currentMediaUrl ? (
            isVideoUrl(currentMediaUrl) ? (
              <video
                ref={videoRef}
                key={ads.length > 1 ? `ad-${currentAdIndex}` : currentMediaUrl}
                src={currentMediaUrl}
                className="absolute inset-0 w-full h-full object-contain object-center"
                autoPlay
                loop={ads.length <= 1}
                muted
                playsInline
                onEnded={ads.length > 1 ? handleAdEnded : undefined}
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt="Mídia de espera"
                className="absolute inset-0 w-full h-full object-contain object-center"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <p className="text-xl">Nenhuma mídia configurada</p>
            </div>
          ))}

          {/* Button Video Overlay */}
          {buttonVideoUrl && (
            <div className="absolute inset-0 z-20 bg-black">
              <video
                src={buttonVideoUrl}
                className="w-full h-full object-contain object-center"
                autoPlay
                playsInline
                onEnded={handleButtonVideoEnd}
              />
            </div>
          )}

          {/* External Link Popup Overlay */}
          {externalPopupOpen && externalUrl && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3">
              <div
                className="relative bg-white rounded-lg overflow-hidden shadow-2xl"
                style={{ width: '95%', height: '95%' }}
              >
                <ScaledIframe src={externalUrl} title="Conteúdo externo" baseWidth={1366} baseHeight={768} />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 z-30"
                  onClick={closeAllPopups}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Context Media Overlay (small, right side of avatar) */}
          {contextMedia && !buttonVideoUrl && !externalPopupOpen && (
            <div className="absolute right-6 top-[38%] -translate-y-1/2 z-30 pointer-events-auto">
              <div className="relative bg-black/60 rounded-xl shadow-2xl p-2 max-w-[260px] max-h-[200px]">
                {contextMedia.type === 'video' ? (
                  <video
                    src={contextMedia.url}
                    className="w-full h-full max-w-[240px] max-h-[180px] object-contain object-center rounded-lg"
                    autoPlay
                    playsInline
                    onEnded={() => setContextMedia(null)}
                  />
                ) : (
                  <img
                    src={contextMedia.url}
                    alt={contextMedia.caption || 'Mídia do contexto'}
                    className="w-full h-full max-w-[240px] max-h-[180px] object-contain object-center rounded-lg"
                  />
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 z-40"
                  onClick={() => setContextMedia(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Buttons overlay */}
          {!buttonVideoUrl && !externalPopupOpen && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {buttons.map(renderButton)}
              </div>
            </div>
          )}

          {isConnected && (
            <div className={controlsClass}>
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative transition-transform hover:scale-105 ${
                    isRecording ? 'animate-pulse' : ''
                  }`}
                  aria-label={isRecording ? 'Parar gravação' : 'Falar por voz'}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white shadow-2xl ring-2 ring-white/20">
                    <Mic className="h-7 w-7" />
                  </span>
                </button>
                <span className="px-4 py-1.5 rounded-full bg-black/80 text-white text-sm font-semibold shadow ring-1 ring-white/10">
                  {isRecording ? 'Gravando...' : 'Falar'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button
                  onClick={endSession}
                  className="transition-transform hover:scale-105"
                  aria-label="Encerrar sessão"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-white shadow-2xl ring-2 ring-white/30">
                    <span className="text-xs font-bold uppercase tracking-wide">Fim</span>
                  </span>
                </button>
                <span className="px-4 py-1.5 rounded-full bg-red-600/95 text-white text-sm font-semibold shadow ring-1 ring-white/20">
                  Encerrar
                </span>
              </div>
            </div>
          )}

          {/* Connecting overlay */}
          {isConnecting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white">
              <span>Conectando ao avatar...</span>
            </div>
          )}
        </div>
      </div>

      {/* Session warning dialog */}
      <Dialog open={showSessionExtendDialog} onOpenChange={setShowSessionExtendDialog}>
        <DialogContent className="bg-black/90 text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Sessão prestes a acabar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-white/80">
              Faltam {sessionSecondsLeft}s. Deseja continuar a sessão?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleSessionContinue}>
                Continuar
              </Button>
              <Button variant="destructive" onClick={endSession}>
                Encerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text chat */}
      {!isLiveAvatar && (
        <div
          className={
            useCornerChat
              ? 'fixed bottom-24 right-5 z-40 w-[min(520px,92vw)] px-3 sm:bottom-28 sm:right-7'
              : 'w-full max-w-2xl mx-auto px-4 mt-6'
          }
        >
          <div
            className={
              useCornerChat
                ? 'flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 shadow-2xl backdrop-blur'
                : 'flex gap-2'
            }
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite para falar com o avatar..."
              onKeyDown={(e) => e.key === 'Enter' && sendText()}
              disabled={isSending || !isConnected}
              className={
                useCornerChat
                  ? 'border-0 bg-transparent text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0'
                  : undefined
              }
            />
            <Button
              onClick={() => sendText()}
              disabled={isSending || !inputText.trim() || !isConnected}
              className={useCornerChat ? 'rounded-full bg-emerald-400/90 text-black hover:bg-emerald-300' : undefined}
            >
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      )}
      {isLiveAvatar && (
        <div className="w-full max-w-2xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              
            </p>
          </div>
        </div>
      )}

      {/* Inactivity Warning Dialog */}
      <Dialog open={showInactivityWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Continuar na sessão?</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{countdown}</div>
            <p className="text-muted-foreground">
              A sessão será encerrada automaticamente em {countdown} segundos.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={endSession} aria-label="Encerrar">
                <img src={STATIC_ASSETS.endAlt} alt="Encerrar" className="w-32 drop-shadow-lg" />
              </button>
              <button onClick={handleContinueSession} aria-label="Continuar">
                <img src={STATIC_ASSETS.continue} alt="Continuar" className="w-32 drop-shadow-lg" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
