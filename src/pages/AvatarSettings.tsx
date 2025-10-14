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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react';
import { CredentialsTab } from '@/components/avatar/CredentialsTab';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
}

interface MediaTrigger {
  id: string;
  trigger_phrase: string;
  media_url: string;
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
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (avatarError) throw avatarError;
      setAvatar(avatarData as Avatar);

      const { data: triggersData, error: triggersError } = await supabase
        .from('media_triggers')
        .select('*')
        .eq('avatar_id', id);

      if (triggersError) throw triggersError;
      setMediaTriggers((triggersData || []) as MediaTrigger[]);

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações do euvatar.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!avatar) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('avatars')
        .update({
          name: avatar.name,
          backstory: avatar.backstory,
          language: avatar.language,
          ai_model: avatar.ai_model,
          voice_model: avatar.voice_model,
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
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
          <h1 className="text-4xl font-bold">Configurações do Euvatar</h1>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="credentials">Credenciais do Euvatar</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Euvatar</Label>
                <Input 
                  id="name" 
                  value={avatar?.name || ''} 
                  onChange={(e) => setAvatar(prev => prev ? {...prev, name: e.target.value} : null)}
                  placeholder="Avatar 1"
                />
              </div>
              <div>
                <Label htmlFor="backstory">Backstory / Contexto de Treinamento</Label>
                <Textarea 
                  id="backstory" 
                  value={avatar?.backstory || ''} 
                  onChange={(e) => setAvatar(prev => prev ? {...prev, backstory: e.target.value} : null)}
                  placeholder="Contexto e personalidade do euvatar..." 
                  rows={6} 
                />
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
                <Select 
                  value={avatar?.language || 'pt-BR'} 
                  onValueChange={(value) => setAvatar(prev => prev ? {...prev, language: value} : null)}
                >
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
                <Select 
                  value={avatar?.ai_model || 'gpt-4'} 
                  onValueChange={(value) => setAvatar(prev => prev ? {...prev, ai_model: value} : null)}
                >
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
                <Select 
                  value={avatar?.voice_model || 'default'} 
                  onValueChange={(value) => setAvatar(prev => prev ? {...prev, voice_model: value} : null)}
                >
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
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload de Mídia Idle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Gatilhos de Mídia</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Gatilho
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure mídias para serem exibidas quando determinadas frases forem detectadas
              </p>
              {mediaTriggers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum gatilho configurado
                </div>
              ) : (
                <div className="space-y-2">
                  {mediaTriggers.map((trigger) => (
                    <div key={trigger.id} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <p className="font-medium">{trigger.trigger_phrase}</p>
                        <p className="text-sm text-muted-foreground">{trigger.media_url}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload de PDFs
              </Button>
            </CardContent>
          </Card>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate(`/avatar/${id}`)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="credentials">
            <CredentialsTab avatarId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AvatarSettings;
