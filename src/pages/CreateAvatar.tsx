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
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sanitizeContextName } from '@/utils/contextNameSanitizer';

interface MediaTrigger {
  trigger_phrase: string;
  media_url: string;
  description: string;
}

const CreateAvatar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [mediaTriggers, setMediaTriggers] = useState<MediaTrigger[]>([]);
  const [newTrigger, setNewTrigger] = useState<MediaTrigger>({ trigger_phrase: '', media_url: '', description: '' });
  const [idleMediaUrl, setIdleMediaUrl] = useState('');
  const [idleMediaFile, setIdleMediaFile] = useState<File | null>(null);
  const [triggerMediaFile, setTriggerMediaFile] = useState<File | null>(null);
  const [uploadingIdle, setUploadingIdle] = useState(false);
  const [uploadingTrigger, setUploadingTrigger] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    backstory: '',
    language: 'pt-BR',
    ai_model: 'gpt-4',
    voice_model: 'alloy',
  });

  const uploadMediaFile = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('avatar-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('avatar-media')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleIdleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdleMediaFile(file);
    setUploadingIdle(true);

    const url = await uploadMediaFile(file);
    if (url) {
      setIdleMediaUrl(url);
      toast({ title: 'Upload realizado com sucesso!' });
    } else {
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    }

    setUploadingIdle(false);
  };

  const handleTriggerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTriggerMediaFile(file);
    setUploadingTrigger(true);

    const url = await uploadMediaFile(file);
    if (url) {
      setNewTrigger({ ...newTrigger, media_url: url });
      toast({ title: 'Upload realizado com sucesso!' });
    } else {
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    }

    setUploadingTrigger(false);
  };

  const handleCreate = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar um euvatar.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: 'Erro',
        description: 'O nome do euvatar é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: avatarData, error: avatarError } = await supabase
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

      if (avatarError) throw avatarError;

      // Create media triggers if any
      if (mediaTriggers.length > 0) {
        const triggersToInsert = mediaTriggers.map(trigger => ({
          avatar_id: avatarData.id,
          trigger_phrase: trigger.trigger_phrase,
          media_url: trigger.media_url,
          description: trigger.description,
        }));

        const { error: triggersError } = await supabase
          .from('media_triggers')
          .insert(triggersToInsert);

        if (triggersError) throw triggersError;
      }

      toast({
        title: 'Sucesso',
        description: 'Euvatar criado com sucesso!',
      });

      navigate(`/avatar/${avatarData.id}`);
    } catch (error: any) {
      console.error('Error creating avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar euvatar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAddTrigger = () => {
    if (!newTrigger.trigger_phrase || !newTrigger.description || !newTrigger.media_url) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos do gatilho.',
        variant: 'destructive',
      });
      return;
    }

    setMediaTriggers([...mediaTriggers, newTrigger]);
    setNewTrigger({ trigger_phrase: '', media_url: '', description: '' });
    setTriggerMediaFile(null);
    
    toast({
      title: 'Sucesso',
      description: 'Gatilho adicionado!',
    });
  };

  const handleRemoveTrigger = (index: number) => {
    setMediaTriggers(mediaTriggers.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">Criar Novo Euvatar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Euvatar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Nome do Euvatar *</Label>
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
                placeholder="Descreva a personalidade, conhecimento e comportamento do euvatar..."
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
                  <SelectItem value="fable">Fable</SelectItem>
                  <SelectItem value="onyx">Onyx</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="shimmer">Shimmer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Mídia Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Imagem ou vídeo exibido enquanto o euvatar não está em sessão ativa
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="idle_media_file">Selecionar Mídia Idle</Label>
                <Input
                  id="idle_media_file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleIdleFileSelect}
                  disabled={uploadingIdle}
                />
                
                {uploadingIdle && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Fazendo upload...
                  </p>
                )}
                
                {idleMediaUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Upload realizado - Preview:
                    </p>
                    {idleMediaFile?.type.startsWith('video/') ? (
                      <video src={idleMediaUrl} controls className="max-h-32 rounded border" />
                    ) : (
                      <img src={idleMediaUrl} alt="Preview" className="max-h-32 rounded border" />
                    )}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste e solte ou clique para selecionar imagem ou vídeo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Gatilhos de Mídia (Contextos)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Defina contextos que, quando identificados pela IA durante a conversa, acionam a exibição de uma mídia específica
            </p>

            {mediaTriggers.length > 0 && (
              <div className="space-y-2 mb-4">
                {mediaTriggers.map((trigger, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Nome: {trigger.trigger_phrase}</p>
                      <p className="text-sm text-muted-foreground mt-1">{trigger.description}</p>
                      <div className="mt-2">
                        {trigger.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                          <video src={trigger.media_url} controls className="max-h-24 rounded" />
                        ) : (
                          <img src={trigger.media_url} alt="Preview" className="max-h-24 rounded" />
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveTrigger(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="trigger_name">Nome do Contexto</Label>
                <Input
                  id="trigger_name"
                  value={newTrigger.trigger_phrase}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const sanitized = sanitizeContextName(rawValue);
                    console.log('Raw:', rawValue, '| Sanitized:', sanitized);
                    setNewTrigger({ ...newTrigger, trigger_phrase: sanitized });
                  }}
                  placeholder="ex: digite 'Apto 3 Quartos' e vire 'apto_3_quartos'"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite normalmente. Espaços viram _, letras maiúsculas viram minúsculas automaticamente.
                </p>
              </div>

              <div>
                <Label htmlFor="trigger_description">Contexto (descrição)</Label>
                <Textarea
                  id="trigger_description"
                  value={newTrigger.description}
                  onChange={(e) => setNewTrigger({ ...newTrigger, description: e.target.value })}
                  placeholder="Ex: Quando o usuário perguntar sobre apartamentos de 3 quartos, mostrar a galeria com as áreas de lazer..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Descreva quando este contexto deve ser acionado. A IA interpretará semanticamente.
                </p>
              </div>

              <div>
                <Label htmlFor="trigger_media_file">Selecionar Mídia</Label>
                <Input
                  id="trigger_media_file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleTriggerFileSelect}
                  disabled={uploadingTrigger}
                />
                
                {uploadingTrigger && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Fazendo upload...
                  </p>
                )}
                
                {newTrigger.media_url && (
                  <div className="mt-2 relative">
                    <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Upload realizado - Preview:
                    </p>
                    <div className="relative inline-block">
                      {triggerMediaFile?.type.startsWith('video/') ? (
                        <video src={newTrigger.media_url} controls className="max-h-32 rounded border" />
                      ) : (
                        <img src={newTrigger.media_url} alt="Preview" className="max-h-32 rounded border" />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={() => {
                          setNewTrigger({ ...newTrigger, media_url: '' });
                          setTriggerMediaFile(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste e solte ou clique para selecionar imagem ou vídeo
                </p>
              </div>

              <Button onClick={handleAddTrigger} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Gatilho
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button onClick={() => navigate('/avatars')} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="flex-1">
            {creating ? 'Criando...' : 'Criar Euvatar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateAvatar;
