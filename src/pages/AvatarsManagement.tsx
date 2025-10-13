import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Settings } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
}

interface Credits {
  total_credits: number;
  used_credits: number;
}

interface AvatarStats {
  avatarId: string;
  webUsage: number;
  appUsage: number;
  totalUsage: number;
}

const AvatarsManagement = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [avatarStats, setAvatarStats] = useState<AvatarStats[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (creditsError) throw creditsError;
      setCredits(creditsData);

      // Fetch conversations for stats
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id);

      if (conversationsError) throw conversationsError;

      // Calculate stats per avatar
      const stats: AvatarStats[] = avatarsData?.map(avatar => {
        const avatarConversations = conversationsData?.filter(c => c.avatar_id === avatar.id) || [];
        const webUsage = avatarConversations.filter(c => c.platform === 'web').reduce((sum, c) => sum + c.credits_used, 0);
        const appUsage = avatarConversations.filter(c => c.platform === 'app').reduce((sum, c) => sum + c.credits_used, 0);
        
        return {
          avatarId: avatar.id,
          webUsage,
          appUsage,
          totalUsage: webUsage + appUsage,
        };
      }) || [];

      setAvatarStats(stats);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const remainingCredits = credits ? credits.total_credits - credits.used_credits : 1000;
  const creditsPercentage = credits ? ((credits.total_credits - credits.used_credits) / credits.total_credits) * 100 : 100;
  const remainingConversations = Math.floor(remainingCredits / 10);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Gerenciamento de Avatares</h1>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Credits Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Uso Geral de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    {remainingCredits} de {credits?.total_credits || 1000} créditos restantes
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ~{remainingConversations} conversas de 2,5min
                  </span>
                </div>
                <Progress value={creditsPercentage} />
              </div>
              <p className="text-sm text-muted-foreground">
                Cada conversa de até 2,5 minutos consome 10 créditos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avatars List */}
        <div className="grid gap-4">
          {avatars.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum avatar criado ainda</p>
                  <Button onClick={() => navigate('/create-avatar')}>
                    Criar Primeiro Avatar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            avatars.map((avatar) => {
              const stats = avatarStats.find(s => s.avatarId === avatar.id);
              return (
                <Card key={avatar.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{avatar.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {avatar.backstory?.substring(0, 100)}...
                        </p>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Web</p>
                            <p className="text-lg font-semibold">{stats?.webUsage || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">App</p>
                            <p className="text-lg font-semibold">{stats?.appUsage || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold">{stats?.totalUsage || 0}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/avatar/${avatar.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/avatar/${avatar.id}/settings`)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarsManagement;
