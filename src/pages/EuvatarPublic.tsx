import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarButton {
  id: string;
  label: string;
  action_type: 'session_start' | 'video_upload' | 'external_link';
  external_url: string | null;
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
  const [videoUploadOpen, setVideoUploadOpen] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [presentationVideoUrl, setPresentationVideoUrl] = useState<string | null>(null);
  
  // Inactivity states
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const presentationVideoRef = useRef<HTMLVideoElement>(null);

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
    if (externalPopupOpen || videoUploadOpen || presentationVideoUrl) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
        startCountdown();
      }, INACTIVITY_TIMEOUT);
    }
  }, [externalPopupOpen, videoUploadOpen, presentationVideoUrl]);

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
    setVideoUploadOpen(false);
    setPresentationVideoUrl(null);
    clearInactivityTimer();
    clearCountdownTimer();
    setShowInactivityWarning(false);
  };

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      if (externalPopupOpen || videoUploadOpen || presentationVideoUrl) {
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
  }, [externalPopupOpen, videoUploadOpen, presentationVideoUrl, resetInactivityTimer]);

  // Start inactivity timer when popup opens
  useEffect(() => {
    if (externalPopupOpen || videoUploadOpen || presentationVideoUrl) {
      resetInactivityTimer();
    } else {
      clearInactivityTimer();
      clearCountdownTimer();
      setShowInactivityWarning(false);
    }
  }, [externalPopupOpen, videoUploadOpen, presentationVideoUrl, resetInactivityTimer]);

  const handleButtonClick = (button: AvatarButton) => {
    switch (button.action_type) {
      case 'session_start':
        handleSessionStart();
        break;
      case 'video_upload':
        setVideoUploadOpen(true);
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > 60) {
        toast({
          title: 'Vídeo muito longo',
          description: 'O vídeo deve ter no máximo 60 segundos.',
          variant: 'destructive',
        });
        return;
      }

      setUploadingVideo(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `presentations/${id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatar-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatar-media')
          .getPublicUrl(fileName);

        setVideoUploadOpen(false);
        setPresentationVideoUrl(publicUrl);
        
        toast({
          title: 'Vídeo enviado!',
          description: 'O avatar irá apresentar seu vídeo.',
        });
      } catch (err: any) {
        console.error('Upload error:', err);
        toast({
          title: 'Erro no upload',
          description: 'Não foi possível enviar o vídeo.',
          variant: 'destructive',
        });
      } finally {
        setUploadingVideo(false);
      }
    };

    video.src = URL.createObjectURL(file);
  };

  const handlePresentationEnd = () => {
    setPresentationVideoUrl(null);
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
      {/* Idle Video / Presentation Video */}
      <div className="absolute inset-0 flex items-center justify-center">
        {presentationVideoUrl ? (
          <video
            ref={presentationVideoRef}
            src={presentationVideoUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            onEnded={handlePresentationEnd}
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

      {/* Buttons overlay - only show when not in presentation mode */}
      {!presentationVideoUrl && !externalPopupOpen && (
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

      {/* Video Upload Dialog */}
      <Dialog open={videoUploadOpen} onOpenChange={(open) => {
        if (!open) setVideoUploadOpen(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Vídeo para Apresentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-upload">Selecione um vídeo (máx. 60 segundos)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('video-upload')?.click()}
                  disabled={uploadingVideo}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingVideo ? 'Enviando...' : 'Escolher Vídeo'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: MP4, WebM, MOV
            </p>
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
