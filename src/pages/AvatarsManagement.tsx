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
      setLoading(false);
      toast({
        title: 'Configuração necessária',
        description: 'Por favor, acesse a aba Cloud para configurar o banco de dados.',
      });
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

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração Necessária</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Para usar o sistema de gerenciamento de avatares, você precisa configurar o banco de dados primeiro.
            </p>
            <p className="mb-4">
              Acesse a aba <strong>Cloud</strong> no menu superior e execute a seguinte migração SQL no <strong>SQL Editor</strong>:
            </p>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`-- Criar tabela de avatares
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  backstory text,
  language text default 'pt-BR',
  ai_model text default 'gpt-5-mini-2025-08-07',
  voice_model text default 'alloy',
  elevenlabs_api_key text,
  idle_media_url text,
  idle_media_type text check (idle_media_type in ('image', 'video')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar tabela de créditos
create table public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  total_credits integer default 1000 not null,
  used_credits integer default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar tabela de conversas
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  avatar_id uuid references public.avatars(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text check (platform in ('web', 'app')) not null,
  duration_seconds integer not null,
  credits_used integer not null,
  topics jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.avatars enable row level security;
alter table public.user_credits enable row level security;
alter table public.conversations enable row level security;

-- Políticas RLS para avatars
create policy "Users can view own avatars"
  on public.avatars for select using (auth.uid() = user_id);
create policy "Users can insert own avatars"
  on public.avatars for insert with check (auth.uid() = user_id);
create policy "Users can update own avatars"
  on public.avatars for update using (auth.uid() = user_id);
create policy "Users can delete own avatars"
  on public.avatars for delete using (auth.uid() = user_id);

-- Políticas RLS para credits
create policy "Users can view own credits"
  on public.user_credits for select using (auth.uid() = user_id);
create policy "Users can update own credits"
  on public.user_credits for update using (auth.uid() = user_id);

-- Políticas RLS para conversations
create policy "Users can view own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);`}
              </pre>
            </div>
            <p className="mt-4">
              Após executar a migração, recarregue esta página para começar a usar o sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AvatarsManagement;
