import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Settings, Lock, User, Clock } from 'lucide-react';
import { UnlockPasswordDialog } from '@/components/avatar/UnlockPasswordDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchBackendCredits, type AvatarHeyGenUsage, type HeyGenCredits } from '@/services/credits';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
  idle_media_url: string | null;
  cover_image_url: string | null;
}

const AvatarsManagement = () => {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [heygenCredits, setHeygenCredits] = useState<HeyGenCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const refreshCredits = useCallback(async () => {
    const creditsData = await fetchBackendCredits(session?.access_token);
    if (!creditsData) {
      console.error('Erro ao buscar créditos HeyGen via backend');
      return;
    }
    setHeygenCredits(creditsData);
  }, [session?.access_token]);

  const fetchData = async () => {
    try {
      // Fetch avatars
      const { data: avatarsData, error: avatarsError } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', user?.id);

      if (avatarsError) throw avatarsError;
      setAvatars(avatarsData || []);

      await refreshCredits();

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(refreshCredits, 30000);
    const handleFocus = () => refreshCredits();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshCredits]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'unlock', password },
      });

      if (error) throw error;

      if (data.success) {
        setShowUnlockDialog(false);
        toast({ title: 'Acesso autorizado!' });
        navigate('/configure-credentials');
        return true;
      } else {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        return false;
      }
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast({ title: 'Erro ao verificar senha', variant: 'destructive' });
      return false;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const totalCredits = heygenCredits?.totalEuvatarCredits ?? 960;
  const totalMinutes = heygenCredits?.totalMinutes ?? 240;
  const fallbackUsageMinutes = (heygenCredits?.avatarUsage || []).reduce((sum, u) => sum + (u.totalMinutes || 0), 0);
  const fallbackUsageCredits = (heygenCredits?.avatarUsage || []).reduce((sum, u) => sum + (u.euvatarCredits || 0), 0);
  const shouldFallbackTotals = Boolean(heygenCredits?.needsCredentialUpdate || heygenCredits?.error);
  const remainingCreditsRaw = shouldFallbackTotals
    ? (totalCredits - fallbackUsageCredits)
    : (heygenCredits?.euvatarCredits ?? (totalCredits - fallbackUsageCredits));
  const remainingMinutesRaw = shouldFallbackTotals
    ? (totalMinutes - fallbackUsageMinutes)
    : (heygenCredits?.minutesRemaining ?? (totalMinutes - fallbackUsageMinutes));
  const remainingCredits = Math.min(Math.max(remainingCreditsRaw, 0), totalCredits);
  const minutesRemaining = Math.min(Math.max(remainingMinutesRaw, 0), totalMinutes);
  const creditsPercentage = totalCredits > 0 ? Math.round((remainingCredits / totalCredits) * 100) : 0;
  const usedCredits = Math.max(0, totalCredits - remainingCredits);
  const usedMinutes = Math.max(0, totalMinutes - minutesRemaining);
  const needsCredentialUpdate = heygenCredits?.needsCredentialUpdate;
  const missingApiKey = Boolean(heygenCredits?.missingApiKey);
  const hasCredentialsConfigured = !heygenCredits?.error && !missingApiKey;

  return (
    <AppLayout title="Gerenciamento de Euvatares">

        {/* Credits Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Uso de Créditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    {remainingCredits} de {totalCredits} créditos restantes
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(minutesRemaining)} ({minutesRemaining}min) de 4h ({totalMinutes}min)
                  </span>
                </div>
                <Progress value={creditsPercentage} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{remainingCredits}</p>
                  <p className="text-xs text-muted-foreground">Créditos Restantes</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatTime(minutesRemaining)}</p>
                  <p className="text-sm text-muted-foreground">({minutesRemaining} min)</p>
                  <p className="text-xs text-muted-foreground">Tempo Restante</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{usedCredits}</p>
                  <p className="text-xs text-muted-foreground">Créditos Usados</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatTime(usedMinutes)}</p>
                  <p className="text-sm text-muted-foreground">({usedMinutes} min)</p>
                  <p className="text-xs text-muted-foreground">Tempo Usado</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                20 créditos = 5 minutos de uso. Plano inicial: 960 créditos (4 horas / 240 minutos).
              </p>
              {needsCredentialUpdate && (heygenCredits?.avatarUsage?.length ?? 0) === 0 && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ A API key do Euvatar está inválida ou expirada. Atualize na aba Credenciais do euvatar.
                </p>
              )}
              {missingApiKey && (
                <p className="text-xs text-red-600 font-medium">
                  ❌ Nenhuma API key configurada para este cliente. Cadastre as credenciais do euvatar para liberar o uso.
                </p>
              )}
              {!hasCredentialsConfigured && !needsCredentialUpdate && !missingApiKey && (
                <p className="text-xs text-yellow-600">
                  Configure as credenciais do euvatar para ver os créditos em tempo real.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Protected: Configure New Avatar */}
        <div className="mb-8 flex justify-end">
          <Button 
            onClick={() => setShowUnlockDialog(true)} 
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            Configurar Novo Euvatar
          </Button>
        </div>

        {/* Avatars List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {avatars.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum euvatar criado ainda</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Primeiro configure as credenciais do euvatar
                  </p>
                  <Button onClick={() => navigate('/create-avatar?next=configure')}>
                    Criar avatar e configurar credenciais
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            avatars.map((avatar) => {
              const usage = heygenCredits?.avatarUsage?.find(u => u.avatarId === avatar.id);
              const totalMinutes = usage?.totalMinutes ?? 0;
              const euvatarCredits = usage?.euvatarCredits ?? 0;
              const sessionCount = usage?.sessionCount ?? 0;
              
              return (
                <Card key={avatar.id} className="hover:shadow-lg transition-shadow flex flex-col overflow-hidden">
                  {avatar.cover_image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img 
                        src={avatar.cover_image_url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b">
                      <User className="h-20 w-20 text-primary/40" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg truncate" title={avatar.name}>{avatar.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between pt-0">
                    <div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {avatar.backstory?.substring(0, 80)}...
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Tempo</p>
                          <p className="text-sm font-semibold">{formatTime(totalMinutes)}</p>
                          <p className="text-xs text-muted-foreground">({totalMinutes}min)</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Créditos</p>
                          <p className="text-sm font-semibold">{euvatarCredits}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Sessões</p>
                          <p className="text-sm font-semibold">{sessionCount}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/avatar/${avatar.id}`)}
                      >
                        Ver Detalhes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/avatar/${avatar.id}?tab=edit`)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <UnlockPasswordDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          onUnlock={handleUnlock}
        />
    </AppLayout>
  );
};

export default AvatarsManagement;
