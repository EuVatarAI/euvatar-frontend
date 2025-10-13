import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
}

interface Conversation {
  id: string;
  platform: string;
  duration: number;
  credits_used: number;
  topics: string[];
  created_at: string;
}

const AvatarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAvatarData();
  }, [user, id, navigate]);

  const fetchAvatarData = async () => {
    try {
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (avatarError) throw avatarError;
      setAvatar(avatarData);

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('avatar_id', id);

      if (conversationsError) throw conversationsError;
      setConversations((conversationsData || []) as Conversation[]);

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching avatar data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do avatar.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const webUsage = conversations.filter(c => c.platform === 'web').reduce((sum, c) => sum + c.credits_used, 0);
  const appUsage = conversations.filter(c => c.platform === 'app').reduce((sum, c) => sum + c.credits_used, 0);
  const totalUsage = webUsage + appUsage;

  // Calculate top topics
  const topicsCount = new Map<string, number>();
  conversations.forEach(conv => {
    conv.topics?.forEach((topic: string) => {
      topicsCount.set(topic, (topicsCount.get(topic) || 0) + 1);
    });
  });
  const topTopics = Array.from(topicsCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-4xl font-bold">{avatar?.name || 'Avatar'}</h1>
          </div>
          <Button onClick={() => navigate(`/avatar/${id}/settings`)}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>

        {avatar?.backstory && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sobre o Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{avatar.backstory}</p>
            </CardContent>
          </Card>
        )}

        {/* Usage Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Consumo de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Web</p>
                <p className="text-2xl font-bold">{webUsage}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">App</p>
                <p className="text-2xl font-bold">{appUsage}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Assuntos Mais Relatados</CardTitle>
          </CardHeader>
          <CardContent>
            {topTopics.length > 0 ? (
              <div className="space-y-2">
                {topTopics.map(([topic, count]: any, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{topic}</span>
                    <span className="text-sm text-muted-foreground">{count} menções</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhuma conversa registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AvatarDetails;
