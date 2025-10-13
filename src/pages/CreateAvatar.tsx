import { useState, useCallback } from 'react';
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
import { ArrowLeft, Upload, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateMediaUrlWithCache, validateMediaUrlServer, type ValidationResult } from '@/utils/mediaValidation';
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
  const [idleMediaValidation, setIdleMediaValidation] = useState<ValidationResult | null>(null);
  const [triggerMediaValidation, setTriggerMediaValidation] = useState<ValidationResult | null>(null);
  const [validatingIdle, setValidatingIdle] = useState(false);
  const [validatingTrigger, setValidatingTrigger] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    backstory: '',
    language: 'pt-BR',
    ai_model: 'gpt-4',
    voice_model: 'alloy',
  });

  // Debounce timer refs
  let idleDebounceTimer: any;
  let triggerDebounceTimer: any;

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
        description: 'Avatar criado com sucesso!',
      });

      navigate(`/avatar/${avatarData.id}`);
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

  const handleAddTrigger = async () => {
    if (!newTrigger.trigger_phrase || !newTrigger.media_url) {
      toast({
        title: 'Erro',
        description: 'Preencha o contexto e a URL da mídia.',
        variant: 'destructive',
      });
      return;
    }

    // Verifica se validação passou (cliente e servidor)
    if (!triggerMediaValidation?.ok) {
      toast({
        title: 'Erro',
        description: 'A URL da mídia não foi validada. Aguarde a validação ou corrija a URL.',
        variant: 'destructive',
      });
      return;
    }

    setMediaTriggers([...mediaTriggers, newTrigger]);
    setNewTrigger({ trigger_phrase: '', media_url: '', description: '' });
    setTriggerMediaValidation(null);
    
    toast({
      title: 'Sucesso',
      description: 'Gatilho adicionado!',
    });
  };

  const handleRemoveTrigger = (index: number) => {
    setMediaTriggers(mediaTriggers.filter((_, i) => i !== index));
  };

  const handleIdleMediaUrlChange = useCallback((url: string) => {
    setIdleMediaUrl(url);
    setIdleMediaValidation(null);
    
    clearTimeout(idleDebounceTimer);
    
    if (!url) {
      setIdleMediaValidation(null);
      return;
    }

    idleDebounceTimer = setTimeout(async () => {
      setValidatingIdle(true);
      
      // Validação cliente
      const clientResult = await validateMediaUrlWithCache(url);
      setIdleMediaValidation(clientResult);
      
      if (clientResult.ok) {
        // Validação servidor
        const serverResult = await validateMediaUrlServer(url);
        setIdleMediaValidation(serverResult);
      }
      
      setValidatingIdle(false);
    }, 400);
  }, []);

  const handleTriggerMediaUrlChange = useCallback((url: string) => {
    setNewTrigger(prev => ({ ...prev, media_url: url }));
    setTriggerMediaValidation(null);
    
    clearTimeout(triggerDebounceTimer);
    
    if (!url) {
      setTriggerMediaValidation(null);
      return;
    }

    triggerDebounceTimer = setTimeout(async () => {
      setValidatingTrigger(true);
      
      // Validação cliente
      const clientResult = await validateMediaUrlWithCache(url);
      setTriggerMediaValidation(clientResult);
      
      if (clientResult.ok) {
        // Validação servidor
        const serverResult = await validateMediaUrlServer(url);
        setTriggerMediaValidation(serverResult);
      }
      
      setValidatingTrigger(false);
    }, 400);
  }, []);

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
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Mídia Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Imagem ou vídeo exibido enquanto o avatar não está em sessão ativa
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="idle_media_url">URL da Mídia Idle</Label>
                <Input
                  id="idle_media_url"
                  type="url"
                  value={idleMediaUrl}
                  onChange={(e) => handleIdleMediaUrlChange(e.target.value)}
                  placeholder="https://exemplo.com/video-idle.mp4"
                  className={idleMediaValidation && !idleMediaValidation.ok ? 'border-red-500' : ''}
                />
                
                {validatingIdle && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Validando mídia...
                  </p>
                )}
                
                {idleMediaValidation && !idleMediaValidation.ok && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {idleMediaValidation.reason}
                  </p>
                )}
                
                {idleMediaValidation?.ok && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Mídia válida - Preview:
                    </p>
                    <img 
                      src={idleMediaUrl} 
                      alt="Preview" 
                      className="max-h-32 rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  Cole a URL de uma imagem ou vídeo de CDN aprovado (Supabase, Cloudinary, CloudFront, S3)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Gatilhos de Mídia</CardTitle>
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
                      <p className="font-medium text-sm text-muted-foreground">Contexto:</p>
                      <p className="mb-1">{trigger.trigger_phrase}</p>
                      <p className="text-xs text-muted-foreground">Mídia:</p>
                      <p className="text-sm truncate">{trigger.media_url}</p>
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
                  onChange={(e) => setNewTrigger({ ...newTrigger, trigger_phrase: sanitizeContextName(e.target.value) })}
                  placeholder="ex: apto_3_quartos"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas letras, números e espaços. Será automaticamente formatado.
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
                <Label htmlFor="trigger_media_url">URL da Mídia (Imagem ou Vídeo)</Label>
                <Input
                  id="trigger_media_url"
                  type="url"
                  value={newTrigger.media_url}
                  onChange={(e) => handleTriggerMediaUrlChange(e.target.value)}
                  placeholder="https://exemplo.com/imagem-produto.jpg"
                  className={triggerMediaValidation && !triggerMediaValidation.ok ? 'border-red-500' : ''}
                />
                
                {validatingTrigger && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Validando mídia...
                  </p>
                )}
                
                {triggerMediaValidation && !triggerMediaValidation.ok && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {triggerMediaValidation.reason}
                  </p>
                )}
                
                {triggerMediaValidation?.ok && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Mídia válida - Preview:
                    </p>
                    <img 
                      src={newTrigger.media_url} 
                      alt="Preview" 
                      className="max-h-32 rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  URL da imagem ou vídeo de CDN aprovado (máx 25MB)
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAddTrigger}
                >
                  Salvar Gatilho
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setNewTrigger({ trigger_phrase: '', media_url: '', description: '' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Gatilho
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Documentos de Treinamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Faça upload de PDFs para enriquecer o conhecimento do avatar (será implementado em breve)
            </p>
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" />
              Upload de PDFs (Em breve)
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-6">
          <Button variant="outline" onClick={() => navigate('/avatars')}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando...' : 'Criar Avatar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateAvatar;
