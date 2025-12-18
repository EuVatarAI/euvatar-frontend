import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, AlertCircle } from 'lucide-react';
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

interface Avatar {
  id: string;
  name: string;
  idle_media_url: string | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Popup states
  const [externalPopupOpen, setExternalPopupOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [buttonVideoUrl, setButtonVideoUrl] = useState<string | null>(null);
  
  // Inactivity states
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;500;600;700&family=Lato:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    fetchData();
    
    return () => {
      clearInactivityTimer();
      clearCountdownTimer();
    };
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch avatar data (public access)
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('id, name, idle_media_url')
        .eq('id', id)
        .single();

      if (avatarError) throw avatarError;
      setAvatar(avatarData);

      // Fetch buttons (need public policy or service role)
      const { data: buttonsData, error: buttonsError } = await supabase
        .from('avatar_buttons')
        .select('*')
        .eq('avatar_id', id)
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      if (buttonsError) throw buttonsError;
      setButtons((buttonsData || []) as AvatarButton[]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Euvatar não encontrado');
    } finally {
      setLoading(false);
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
    
    // Only start timer if a popup is open
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

  // Track user activity
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

  // Start inactivity timer when popup opens
  useEffect(() => {
    if (externalPopupOpen || buttonVideoUrl) {
      resetInactivityTimer();
    } else {
      clearInactivityTimer();
      clearCountdownTimer();
      setShowInactivityWarning(false);
    }
  }, [externalPopupOpen, buttonVideoUrl, resetInactivityTimer]);

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
    // TODO: Integrate with HeyGen session start
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Idle Video / Button Video */}
      <div className="absolute inset-0 flex items-center justify-center">
        {buttonVideoUrl ? (
          <video
            src={buttonVideoUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            onEnded={handleButtonVideoEnd}
          />
        ) : avatar.idle_media_url ? (
          <video
            ref={videoRef}
            src={avatar.idle_media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div className="text-white/50 text-center">
            <p className="text-xl">Nenhum vídeo idle configurado</p>
          </div>
        )}
      </div>

      {/* Buttons overlay - only show when not playing button video */}
      {!buttonVideoUrl && !externalPopupOpen && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">
            {buttons.map(renderButton)}
          </div>
        </div>
      )}

      {/* External Link Popup */}
      <Dialog open={externalPopupOpen} onOpenChange={(open) => {
        if (!open) closeAllPopups();
      }}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
          <div className="relative w-full h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={closeAllPopups}
            >
              <X className="h-4 w-4" />
            </Button>
            <iframe
              src={externalUrl}
              className="w-full h-full border-0"
              title="Conteúdo externo"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </DialogContent>
      </Dialog>

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
