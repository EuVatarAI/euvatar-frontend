import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
  elevenlabs_api_key: string | null;
  idle_media_url: string | null;
  idle_media_type: string | null;
}

interface MediaTrigger {
  id: string;
  trigger_phrase: string;
  media_url: string;
  media_type: string;
  orientation: string | null;
}

const AvatarSettings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [mediaTriggers, setMediaTriggers] = useState<MediaTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAvatarSettings();
  }, [user, id, navigate]);

  const fetchAvatarSettings = async () => {
    try {
      toast({
        title: 'Configuração necessária',
        description: 'Configure o banco de dados na aba Cloud primeiro.',
      });
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!avatar) return;
    
    setSaving(true);
    try {
      toast({
        title: 'Configuração necessária',
        description: 'Configure o banco de dados na aba Cloud primeiro.',
      });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate(`/avatar/${id}`)} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">Configurações do Avatar</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações necessárias</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Configure o banco de dados na aba <strong>Cloud</strong> para usar todas as funcionalidades de configuração do avatar.</p>
          </CardContent>
        </Card>

        {/* Campos de configuração desabilitados até o banco estar configurado */}
        <div className="space-y-6 opacity-50 pointer-events-none">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Avatar</Label>
                <Input id="name" placeholder="Avatar 1" disabled />
              </div>
              <div>
                <Label htmlFor="backstory">Backstory / Contexto de Treinamento</Label>
                <Textarea id="backstory" placeholder="Contexto e personalidade do avatar..." rows={6} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">Idioma</Label>
                <Select disabled>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (BR)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ai_model">Modelo de IA</Label>
                <Select disabled>
                  <SelectTrigger id="ai_model">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                    <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                    <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="voice_model">Modelo de Voz</Label>
                <Select disabled>
                  <SelectTrigger id="voice_model">
                    <SelectValue placeholder="Selecione a voz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="elevenlabs_key">API Key Eleven Labs (opcional)</Label>
                <Input id="elevenlabs_key" type="password" placeholder="sk-..." disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mídia Idle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Imagem ou vídeo exibido antes do usuário iniciar uma conversa
              </p>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Upload de Mídia Idle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Gatilhos de Mídia</CardTitle>
                <Button variant="outline" size="sm" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Gatilho
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure mídias para serem exibidas quando determinadas frases forem detectadas
              </p>
              <div className="text-center text-muted-foreground py-8">
                Nenhum gatilho configurado
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentos de Treinamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload de PDFs para treinar o avatar com informações específicas
              </p>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Upload de PDFs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AvatarSettings;
