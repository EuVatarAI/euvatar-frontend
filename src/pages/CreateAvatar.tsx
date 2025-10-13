import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const CreateAvatar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    backstory: '',
    language: 'pt-BR',
    ai_model: 'gpt-4',
    voice_model: 'alloy',
    heygen_avatar_id: '',
    heygen_voice_id: '',
  });

  const handleCreate = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar um avatar.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: 'Erro',
        description: 'O nome do avatar é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('avatars')
        .insert({
          user_id: user.id,
          name: formData.name,
          backstory: formData.backstory,
          language: formData.language,
          ai_model: formData.ai_model,
          voice_model: formData.voice_model,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Avatar criado com sucesso!',
      });

      navigate(`/avatar/${data.id}`);
    } catch (error: any) {
      console.error('Error creating avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar avatar.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">Criar Novo Avatar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Avatar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Nome do Avatar *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Assistente Virtual"
              />
            </div>

            <div>
              <Label htmlFor="backstory">Backstory / Contexto de Treinamento</Label>
              <Textarea
                id="backstory"
                value={formData.backstory}
                onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                placeholder="Descreva a personalidade, conhecimento e comportamento do avatar..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
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
                value={formData.ai_model}
                onValueChange={(value) => setFormData({ ...formData, ai_model: value })}
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
                value={formData.voice_model}
                onValueChange={(value) => setFormData({ ...formData, voice_model: value })}
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

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Integração HeyGen (Opcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Configure a integração com HeyGen para usar avatares de vídeo realistas
                </p>
                
                <div>
                  <Label htmlFor="heygen_avatar_id">HeyGen Avatar ID</Label>
                  <Input
                    id="heygen_avatar_id"
                    value={formData.heygen_avatar_id}
                    onChange={(e) => setFormData({ ...formData, heygen_avatar_id: e.target.value })}
                    placeholder="ID do avatar da sua conta HeyGen"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Você pode encontrar o ID do avatar no painel do HeyGen
                  </p>
                </div>

                <div>
                  <Label htmlFor="heygen_voice_id">HeyGen Voice ID</Label>
                  <Input
                    id="heygen_voice_id"
                    value={formData.heygen_voice_id}
                    onChange={(e) => setFormData({ ...formData, heygen_voice_id: e.target.value })}
                    placeholder="ID da voz no HeyGen"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ID da voz que será usada para o avatar HeyGen
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={() => navigate('/avatars')}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Avatar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAvatar;
