import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScaledIframe } from '@/components/ScaledIframe';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, AlertCircle, Maximize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  avatar_orientation: string | null;
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const COUNTDOWN_SECONDS = 10;

const BORDER_CONFIG = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

const getPadding = (fontSize: number) => {
  const paddingX = Math.max(12, Math.round(fontSize * 0.8));
  const paddingY = Math.max(6, Math.round(fontSize * 0.4));
  return { paddingX, paddingY };
};

export default function EuvatarPublic() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
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
  
  // Inactivity states
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine aspect ratio based on orientation
  const isVertical = avatar?.avatar_orientation === 'vertical';
  const aspectRatio = isVertical ? '9 / 16' : '16 / 9';

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
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch avatar data
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('id, name, idle_media_url, avatar_orientation')
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
    toast({
      title: 'Iniciando sessão...',
      description: 'Conectando ao avatar interativo.',
    });
  };

  const handleButtonVideoEnd = () => {
    setButtonVideoUrl(null);
  };

  const renderButton = (button: AvatarButton) => {
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
  const currentMediaUrl = ads.length > 0 ? ads[currentAdIndex]?.media_url : avatar?.idle_media_url;

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
      className="min-h-screen bg-black flex items-center justify-center overflow-hidden"
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
        className="relative w-full h-full flex items-center justify-center"
        style={{ 
          maxWidth: isVertical ? 'calc(100vh * 9 / 16)' : '100%',
          maxHeight: isVertical ? '100%' : 'calc(100vw * 9 / 16)',
        }}
      >
        <div
          className="relative bg-black"
          style={{
            aspectRatio,
            width: isVertical ? 'auto' : '100%',
            height: isVertical ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* Idle/Ads Video */}
          {currentMediaUrl ? (
            <video
              ref={videoRef}
              key={currentMediaUrl}
              src={currentMediaUrl}
              className="absolute inset-0 w-full h-full object-contain"
              autoPlay
              loop={ads.length === 0}
              muted
              playsInline
              onEnded={ads.length > 0 ? handleAdEnded : undefined}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <p className="text-xl">Nenhum vídeo configurado</p>
            </div>
          )}

          {/* Button Video Overlay */}
          {buttonVideoUrl && (
            <div className="absolute inset-0 z-20 bg-black">
              <video
                src={buttonVideoUrl}
                className="w-full h-full object-contain"
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

          {/* Buttons overlay */}
          {!buttonVideoUrl && !externalPopupOpen && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {buttons.map(renderButton)}
              </div>
            </div>
          )}
        </div>
      </div>

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
            <Button onClick={handleContinueSession} className="w-full">
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
