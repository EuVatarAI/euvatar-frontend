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
  duration_seconds: number;
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
      setLoading(false);
      toast({
        title: 'Configuração necessária',
        description: 'Configure o banco de dados na aba Cloud primeiro.',
      });
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

  const webUsage = 0;
  const appUsage = 0;
  const totalUsage = 0;
  const topTopics: [string, number][] = [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-4xl font-bold">Avatar {id?.slice(0, 8)}</h1>
          </div>
          <Button onClick={() => navigate(`/avatar/${id}/settings`)}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuração necessária</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Configure o banco de dados na aba <strong>Cloud</strong> para ver os detalhes do avatar.</p>
          </CardContent>
        </Card>

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
