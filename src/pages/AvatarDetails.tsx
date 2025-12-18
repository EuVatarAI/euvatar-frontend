import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Plus, Trash2, CheckCircle2, Save, Upload, FileText, ImageIcon, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { sanitizeContextName } from '@/utils/contextNameSanitizer';
import { CredentialsTab } from '@/components/avatar/CredentialsTab';
import { AdsManager } from '@/components/avatar/AdsManager';

interface Avatar {
  id: string;
  name: string;
  backstory: string | null;
  language: string;
  ai_model: string;
  voice_model: string;
  idle_media_url?: string | null;
  cover_image_url?: string | null;
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mediaTriggers, setMediaTriggers] = useState<MediaTrigger[]>([]);
  const [newTrigger, setNewTrigger] = useState<MediaTrigger>({ trigger_phrase: '', media_url: '', description: '' });
  const [triggerMediaFile, setTriggerMediaFile] = useState<File | null>(null);
  const [uploadingTrigger, setUploadingTrigger] = useState(false);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
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
  const [originalFormData, setOriginalFormData] = useState({
    name: '',
    backstory: '',
    language: 'pt-BR',
    ai_model: 'gpt-4',
    voice_model: 'alloy',
  });

  const stripTrainingNotes = (text: string) => {
    // Remove legacy markers like: [Treinado com o documento: arquivo.pdf]
    return text
      .replace(/\n?\n?\[Treinado com o documento:[^\]]+\]/g, '')
      .trimEnd();
  };
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
      setCoverImageUrl(avatarData.cover_image_url || null);
      const formDataFromDb = {
        name: avatarData.name,
        backstory: stripTrainingNotes(avatarData.backstory || ''),
        language: avatarData.language,
        ai_model: avatarData.ai_model,
        voice_model: avatarData.voice_model,
      };
      setFormData(formDataFromDb);
      setOriginalFormData(formDataFromDb);

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
        description: 'Erro ao carregar dados do euvatar.',
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

  const handleCoverImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const url = await uploadMediaFile(file);
    if (url) {
      setCoverImageUrl(url);
      // Save immediately to database
      try {
        await supabase
          .from('avatars')
          .update({ cover_image_url: url })
          .eq('id', id);
        toast({ title: 'Imagem de capa atualizada!' });
      } catch (error) {
        toast({ title: 'Erro ao salvar imagem', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    }
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Erro',
        description: 'O nome do euvatar é obrigatório.',
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
          backstory: stripTrainingNotes(formData.backstory),
          language: formData.language,
          ai_model: formData.ai_model,
          voice_model: formData.voice_model,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: 'Euvatar atualizado com sucesso!',
      });

      fetchAvatarData();
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar euvatar. Tente novamente.',
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
      // Simulate training delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTrainedDocs(prev => new Set(prev).add(docId));

      toast({
        title: 'Sucesso',
        description: `Euvatar treinado com "${docName}"!`,
      });
    } catch (error: any) {
      console.error('Error training avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao treinar euvatar.',
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

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const webUsage = conversations.filter(c => c.platform === 'web').reduce((sum, c) => sum + c.credits_used, 0);
  const appUsage = conversations.filter(c => c.platform === 'app').reduce((sum, c) => sum + c.credits_used, 0);
  const totalUsage = webUsage + appUsage;
  
  // Calculate total duration in seconds
  const totalDuration = conversations.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

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
          <h1 className="text-4xl font-bold">{avatar?.name || 'Euvatar'}</h1>
        </div>

        <Tabs defaultValue={searchParams.get('tab') || 'overview'} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="edit">Editar Euvatar</TabsTrigger>
            <TabsTrigger value="ads">Anúncios</TabsTrigger>
            <TabsTrigger value="media">Gatilhos de Mídia</TabsTrigger>
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Cover Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Imagem de Capa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {coverImageUrl ? (
                      <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Sobre o Euvatar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-4">
                    {avatar?.backstory || 'Nenhuma descrição definida.'}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Idioma</p>
                      <p className="font-medium">{avatar?.language || 'pt-BR'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modelo IA</p>
                      <p className="font-medium">{avatar?.ai_model || 'gpt-4'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modelo de Voz</p>
                      <p className="font-medium">{avatar?.voice_model || 'default'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Idle Media and Training Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mídia Idle</CardTitle>
                </CardHeader>
                <CardContent>
                  {avatar?.idle_media_url ? (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <video 
                        src={avatar.idle_media_url} 
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma mídia idle configurada.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentos Treinados</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainingDocuments.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {trainingDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate flex-1">{doc.document_name}</span>
                          {trainedDocs.has(doc.id) && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum documento de treinamento.</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {trainingDocuments.length} documento(s) carregado(s)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Topics and Access Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assuntos Mais Relatados</CardTitle>
                </CardHeader>
                <CardContent>
                  {topTopics.length > 0 ? (
                    <div className="space-y-2">
                      {topTopics.map(([topic, count]: any, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm">{topic}</span>
                          <span className="text-xs text-muted-foreground">{count} menções</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma conversa registrada ainda.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dias com Mais Acesso</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayOrder = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                    const dayAbbrev: Record<string, string> = {
                      'domingo': 'Dom',
                      'segunda-feira': 'Seg',
                      'terça-feira': 'Ter',
                      'quarta-feira': 'Qua',
                      'quinta-feira': 'Qui',
                      'sexta-feira': 'Sex',
                      'sábado': 'Sáb'
                    };
                    const dayCount = new Map<string, number>();
                    conversations.forEach(conv => {
                      const day = new Date(conv.created_at).toLocaleDateString('pt-BR', { 
                        weekday: 'long' 
                      });
                      dayCount.set(day, (dayCount.get(day) || 0) + 1);
                    });
                    
                    const chartData = dayOrder.map(day => ({
                      name: dayAbbrev[day] || day.slice(0, 3),
                      acessos: dayCount.get(day) || 0
                    }));
                    
                    const hasData = chartData.some(d => d.acessos > 0);
                    
                    return hasData ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value: number) => [`${value} acessos`, 'Acessos']}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="acessos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Nenhum acesso registrado ainda.</p>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Credits Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Consumo de Créditos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Web</p>
                    <p className="text-2xl font-bold">{webUsage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">App</p>
                    <p className="text-2xl font-bold">{appUsage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Créditos</p>
                    <p className="text-2xl font-bold">{totalUsage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Tempo Total
                    </p>
                    <p className="text-2xl font-bold">
                      {totalHours > 0 ? `${totalHours}h ` : ''}{totalMinutes}min
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Euvatar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cover Image Upload */}
                <div>
                  <Label>Imagem de Capa</Label>
                  <div className="mt-2 flex items-start gap-4">
                    <div className="w-40 aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
                      {coverImageUrl ? (
                        <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingCover}
                        onClick={() => document.getElementById('cover-image')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingCover ? 'Enviando...' : 'Alterar Imagem'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Recomendado: 16:9, mínimo 400x225px
                      </p>
                    </div>
                  </div>
                  <Input
                    id="cover-image"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                    className="hidden"
                  />
                </div>

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

                <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="ads" className="mt-6">
            <AdsManager avatarId={id!} />
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

          <TabsContent value="credentials" className="mt-6">
            <CredentialsTab avatarId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AvatarDetails;
