import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Settings, Plus, Lock, User, Clock } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import euvatarLogo from '@/assets/euvatar-logo-white.png';
import { UnlockPasswordDialog } from '@/components/avatar/UnlockPasswordDialog';

type Avatar = Database['public']['Tables']['avatars']['Row'] & {
  cover_image_url?: string | null;
};

interface AvatarHeyGenUsage {
  avatarId: string;
  heygenAvatarId?: string;
  totalSeconds: number;
  totalMinutes: number;
  heygenCredits: number;
  euvatarCredits: number;
  sessionCount: number;
}

interface HeyGenCredits {
  euvatarCredits: number;
  heygenCredits: number;
  totalEuvatarCredits: number;
  minutesRemaining: number;
  totalMinutes: number;
  hoursRemaining: number;
  totalHours: number;
  usedEuvatarCredits: number;
  usedMinutes: number;
  percentageRemaining: number;
  error?: string;
  needsCredentialUpdate?: boolean;
  avatarUsage?: AvatarHeyGenUsage[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [heygenCredits, setHeygenCredits] = useState<HeyGenCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch avatars
      const { data: avatarsData, error: avatarsError } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', user?.id);

      if (avatarsError) throw avatarsError;
      setAvatars(avatarsData || []);

      // Fetch HeyGen credits via edge function
      const { data: creditsData, error: creditsError } = await supabase.functions.invoke('get-heygen-credits');
      
      if (creditsError) {
        console.error('Erro ao buscar créditos:', creditsError);
      } else {
        setHeygenCredits(creditsData);
      }

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const remainingCredits = heygenCredits?.euvatarCredits ?? 960;
  const totalCredits = heygenCredits?.totalEuvatarCredits ?? 960;
  const creditsPercentage = heygenCredits?.percentageRemaining ?? 100;
  const minutesRemaining = heygenCredits?.minutesRemaining ?? 240;
  const hoursRemaining = heygenCredits?.hoursRemaining ?? 4;
  const hasCredentialsConfigured = !heygenCredits?.error;
  const needsCredentialUpdate = heygenCredits?.needsCredentialUpdate;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-2">
            <img
              src={euvatarLogo}
              alt="Logo da Euvatar"
              className="h-20 w-auto object-contain"
            />
            <h1 className="text-3xl font-bold">Gerenciamento de Euvatares</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

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
                    {formatTime(minutesRemaining)} ({minutesRemaining}min) de 4h (240min)
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
                  <p className="text-2xl font-bold">{totalCredits - remainingCredits}</p>
                  <p className="text-xs text-muted-foreground">Créditos Usados</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatTime(240 - minutesRemaining)}</p>
                  <p className="text-sm text-muted-foreground">({240 - minutesRemaining} min)</p>
                  <p className="text-xs text-muted-foreground">Tempo Usado</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                20 créditos = 5 minutos de uso. Plano inicial: 960 créditos (4 horas / 240 minutos).
              </p>
              {needsCredentialUpdate && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ A API key do Euvatar está inválida ou expirada. Atualize na aba Credenciais do euvatar.
                </p>
              )}
              {!hasCredentialsConfigured && !needsCredentialUpdate && (
                <p className="text-xs text-yellow-600">
                  Configure as credenciais do euvatar para ver os créditos em tempo real.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Protected: Configure New Avatar */}
        <Card className="mb-8 border-primary/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Configurar Novo Euvatar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure as credenciais para criar um novo euvatar. Esta área é protegida por senha.
            </p>
            <Button onClick={() => setShowUnlockDialog(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Configurar Credenciais
            </Button>
          </CardContent>
        </Card>

        {/* Avatars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {avatars.length > 0 ? (
            avatars.map((avatar) => {
              const usage = heygenCredits?.avatarUsage?.find(u => u.avatarId === avatar.id);
              const totalMinutes = usage?.totalMinutes ?? 0;
              const euvatarCredits = usage?.euvatarCredits ?? 0;
              const sessionCount = usage?.sessionCount ?? 0;
              
              return (
                <Card 
                  key={avatar.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => navigate(`/avatar/${avatar.id}`)}
                >
                  {avatar.cover_image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={avatar.cover_image_url}
                        alt={`Capa do euvatar ${avatar.name}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b">
                      <User className="h-16 w-16 text-primary/40" />
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="truncate" title={avatar.name}>{avatar.name}</CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/avatar/${avatar.id}/settings`);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tempo usado:</span>
                        <span className="font-medium">{formatTime(totalMinutes)} ({totalMinutes}min)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Créditos usados:</span>
                        <span>{euvatarCredits}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sessões:</span>
                        <span>{sessionCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhum euvatar criado ainda.
                </p>
                <Button onClick={() => navigate('/avatars')}>
                  Criar Primeiro Euvatar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <UnlockPasswordDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          onUnlock={handleUnlock}
        />
      </div>
    </div>
  );
};

export default Dashboard;
