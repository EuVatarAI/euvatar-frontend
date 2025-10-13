import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Settings } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Avatar = Database['public']['Tables']['avatars']['Row'];
type UserCredits = Database['public']['Tables']['user_credits']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

interface AvatarStats {
  avatarId: string;
  webUsage: number;
  appUsage: number;
  totalUsage: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
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

      // Fetch conversations stats per avatar
      if (avatarsData && avatarsData.length > 0) {
        const statsPromises = avatarsData.map(async (avatar) => {
          const { data: conversations } = await supabase
            .from('conversations')
            .select('platform, credits_used')
            .eq('avatar_id', avatar.id);

          const webUsage = conversations?.filter(c => c.platform === 'web')
            .reduce((sum, c) => sum + c.credits_used, 0) || 0;
          const appUsage = conversations?.filter(c => c.platform === 'app')
            .reduce((sum, c) => sum + c.credits_used, 0) || 0;

          return {
            avatarId: avatar.id,
            webUsage,
            appUsage,
            totalUsage: webUsage + appUsage
          };
        });

        const stats = await Promise.all(statsPromises);
        setAvatarStats(stats);
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
                    {remainingCredits} de 1000 créditos restantes
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ~{remainingConversations} conversas de 2,5min
                  </span>
                </div>
                <Progress value={creditsPercentage} />
              </div>
              <p className="text-sm text-muted-foreground">
                Cada conversa de até 2,5 minutos consome 10 créditos. Configure o banco de dados na aba Cloud para começar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avatars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {avatars.length > 0 ? (
            avatars.map((avatar) => {
              const stats = avatarStats.find(s => s.avatarId === avatar.id);
              return (
                <Card 
                  key={avatar.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/avatar/${avatar.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{avatar.name}</CardTitle>
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
                        <span className="text-muted-foreground">Web:</span>
                        <span>{stats?.webUsage || 0} créditos</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">App:</span>
                        <span>{stats?.appUsage || 0} créditos</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span>Total:</span>
                        <span>{stats?.totalUsage || 0} créditos</span>
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
                  Nenhum avatar criado ainda.
                </p>
                <Button onClick={() => navigate('/avatars')}>
                  Criar Primeiro Avatar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
