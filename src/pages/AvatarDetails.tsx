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
import { ArrowLeft, Plus, Trash2, CheckCircle2, Save, Upload, FileText } from 'lucide-react';
import { sanitizeContextName } from '@/utils/contextNameSanitizer';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
}

interface MediaTrigger {
  id?: string;
  trigger_phrase: string;
  media_url: string;
  description: string;
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
  const [mediaTriggers, setMediaTriggers] = useState<MediaTrigger[]>([]);
  const [newTrigger, setNewTrigger] = useState<MediaTrigger>({ trigger_phrase: '', media_url: '', description: '' });
  const [idleMediaUrl, setIdleMediaUrl] = useState('');
  const [idleMediaFile, setIdleMediaFile] = useState<File | null>(null);
  const [triggerMediaFile, setTriggerMediaFile] = useState<File | null>(null);
  const [uploadingIdle, setUploadingIdle] = useState(false);
  const [uploadingTrigger, setUploadingTrigger] = useState(false);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trainingDocuments, setTrainingDocuments] = useState<any[]>([]);
  const [trainingDocId, setTrainingDocId] = useState<string | null>(null);
  const [trainedDocs, setTrainedDocs] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    backstory: '',
    language: 'pt-BR',
    ai_model: 'gpt-4',
    voice_model: 'alloy',
  });

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
      setFormData({
        name: avatarData.name,
        backstory: avatarData.backstory || '',
        language: avatarData.language,
        ai_model: avatarData.ai_model,
        voice_model: avatarData.voice_model,
      });

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('avatar_id', id);

      if (conversationsError) throw conversationsError;
      setConversations((conversationsData || []) as Conversation[]);

      const { data: triggersData, error: triggersError } = await supabase
        .from('media_triggers')
        .select('*')
        .eq('avatar_id', id);

      if (triggersError) throw triggersError;
      setMediaTriggers((triggersData || []) as MediaTrigger[]);

      const { data: docsData, error: docsError } = await supabase
        .from('training_documents')
        .select('*')
        .eq('avatar_id', id);

      if (docsError) throw docsError;
      setTrainingDocuments((docsData || []) as any[]);

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

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Erro',
        description: 'O nome do avatar é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('avatars')
        .update({
          name: formData.name,
          backstory: formData.backstory,
          language: formData.language,
          ai_model: formData.ai_model,
          voice_model: formData.voice_model,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: 'Avatar atualizado com sucesso!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar avatar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrigger = async () => {
    if (!newTrigger.trigger_phrase || !newTrigger.description || !newTrigger.media_url) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos do gatilho.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('media_triggers')
        .insert({
          avatar_id: id,
          trigger_phrase: newTrigger.trigger_phrase,
          media_url: newTrigger.media_url,
          description: newTrigger.description,
        });

      if (error) throw error;

      setNewTrigger({ trigger_phrase: '', media_url: '', description: '' });
      setTriggerMediaFile(null);
      
      toast({
        title: 'Sucesso',
        description: 'Gatilho adicionado!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error adding trigger:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar gatilho.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveTrigger = async (triggerId: string) => {
    try {
      const { error } = await supabase
        .from('media_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Gatilho removido!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error removing trigger:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover gatilho.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveIdleMedia = () => {
    setIdleMediaUrl('');
    setIdleMediaFile(null);
    toast({
      title: 'Mídia removida',
      description: 'Mídia idle removida com sucesso.',
    });
  };

  const handleTrainingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTraining(true);
    try {
      const fileName = `${user?.id}/training/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatar-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatar-media')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('training_documents')
        .insert({
          avatar_id: id,
          document_url: publicUrl,
          document_name: file.name,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Sucesso',
        description: 'Documento de treinamento adicionado!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error uploading training document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar documento.',
        variant: 'destructive',
      });
    } finally {
      setUploadingTraining(false);
    }
  };

  const handleRemoveTrainingDocument = async (docId: string, docUrl: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('training_documents')
        .delete()
        .eq('id', docId);

      if (deleteError) throw deleteError;

      // Extract file path from URL and delete from storage
      const urlParts = docUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('training')).join('/');
      
      await supabase.storage
        .from('avatar-media')
        .remove([`${user?.id}/${filePath}`]);

      toast({
        title: 'Sucesso',
        description: 'Documento removido!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error removing document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover documento.',
        variant: 'destructive',
      });
    }
  };

  const handleTrainFromDocument = async (docId: string, docName: string) => {
    setTrainingDocId(docId);
    try {
      // Add a note to the backstory about this specific training document
      const trainingNote = `\n\n[Treinado com o documento: ${docName}]`;
      
      const updatedBackstory = formData.backstory + trainingNote;

      const { error: updateError } = await supabase
        .from('avatars')
        .update({
          backstory: updatedBackstory,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, backstory: updatedBackstory }));
      setTrainedDocs(prev => new Set(prev).add(docId));

      toast({
        title: 'Sucesso',
        description: `Avatar treinado com "${docName}"!`,
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error training avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao treinar avatar.',
        variant: 'destructive',
      });
    } finally {
      setTrainingDocId(null);
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
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">{avatar?.name || 'Avatar'}</h1>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="edit">Editar Avatar</TabsTrigger>
            <TabsTrigger value="media">Gatilhos de Mídia</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {avatar?.backstory && (
              <Card>
                <CardHeader>
                  <CardTitle>Sobre o Avatar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{avatar.backstory}</p>
                </CardContent>
              </Card>
            )}

            <Card>
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
          </TabsContent>

          <TabsContent value="edit" className="space-y-6 mt-6">
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
                  <div className="mt-3 space-y-3">
                    <Label htmlFor="training-docs" className="cursor-pointer">
                      <Button
                        type="button"
                        disabled={uploadingTraining}
                        onClick={() => document.getElementById('training-docs')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingTraining ? 'Enviando...' : 'Adicionar Documentos de Treinamento'}
                      </Button>
                    </Label>
                    <Input
                      id="training-docs"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleTrainingFileSelect}
                      className="hidden"
                    />
                    
                    {trainingDocuments.length > 0 && (
                      <div className="space-y-2">
                        {trainingDocuments.map((doc) => {
                          const isTraining = trainingDocId === doc.id;
                          const isTrained = trainedDocs.has(doc.id);
                          
                          return (
                            <div key={doc.id} className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                              <div className="flex items-center gap-2 flex-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{doc.document_name}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleTrainFromDocument(doc.id, doc.document_name)}
                                  disabled={isTraining || isTrained}
                                  variant={isTrained ? "secondary" : "default"}
                                >
                                  {isTraining ? (
                                    <span className="animate-spin">⏳</span>
                                  ) : isTrained ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTrainingDocument(doc.id, doc.document_url)}
                                  disabled={isTraining}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mídia Idle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Imagem ou vídeo exibido enquanto o avatar não está em sessão ativa
                </p>
                <div className="space-y-4">
                  {idleMediaUrl ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Preview da mídia:
                        </p>
                        {idleMediaFile?.type.startsWith('video/') ? (
                          <video src={idleMediaUrl} controls className="w-full rounded-lg border" />
                        ) : (
                          <img src={idleMediaUrl} alt="Preview" className="w-full rounded-lg border" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleRemoveIdleMedia}
                        className="w-full"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Vídeo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="idle_media_file" className="cursor-pointer">
                        <Button
                          type="button"
                          className="w-full"
                          disabled={uploadingIdle}
                          onClick={() => document.getElementById('idle_media_file')?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingIdle ? 'Enviando...' : 'Enviar Vídeo Idle'}
                        </Button>
                      </Label>
                      <Input
                        id="idle_media_file"
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleIdleFileSelect}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">
                        Clique no botão acima para selecionar imagem ou vídeo
                      </p>
                    </div>
                  )}
                  
                  {idleMediaUrl && (
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Salvando...' : 'Salvar Mídia Idle'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gatilhos de Mídia (Contextos)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina contextos que, quando identificados pela IA durante a conversa, acionam a exibição de uma mídia específica
                </p>

                {mediaTriggers.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {mediaTriggers.map((trigger) => (
                      <div key={trigger.id} className="flex justify-between items-start p-3 bg-muted rounded">
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
                          onClick={() => trigger.id && handleRemoveTrigger(trigger.id)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AvatarDetails;
