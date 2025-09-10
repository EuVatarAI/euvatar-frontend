import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  MapPin, 
  Bot, 
  Brain, 
  Mic, 
  FileText,
  Image,
  Video,
  Plus,
  Copy
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'member';
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  settings: any;
}

interface CreateSquareProps {
  user: {
    name: string;
    email: string;
  };
  organization: Organization | null;
  profile: Profile | null;
  onLogout: () => void;
  onBack: () => void;
}

export const CreateSquare = ({ user, organization, profile, onLogout, onBack }: CreateSquareProps) => {
  const [step, setStep] = useState<'square' | 'totem'>('square');
  const [squareData, setSquareData] = useState({
    name: '',
    location: ''
  });
  const [totemData, setTotemData] = useState({
    characterName: '',
    llmModel: '',
    voiceModel: '',
    backstory: '',
    contextFiles: [] as File[],
    backgroundImages: [] as File[],
    mediaFiles: [] as File[]
  });
  const { toast } = useToast();

  const llmModels = [
    { value: 'gpt-4', label: 'GPT-4 (Recomendado)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'claude-3', label: 'Claude 3' },
    { value: 'gemini-pro', label: 'Gemini Pro' }
  ];

  const voiceModels = [
    { value: 'sarah', label: 'Sarah - Profissional Feminina' },
    { value: 'daniel', label: 'Daniel - Profissional Masculino' },
    { value: 'laura', label: 'Laura - Jovem Feminina' },
    { value: 'roger', label: 'Roger - Experiente Masculino' },
    { value: 'aria', label: 'Aria - Calorosa Feminina' }
  ];

  const handleSquareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squareData.name || !squareData.location) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e localização da praça",
        variant: "destructive",
      });
      return;
    }
    setStep('totem');
  };

  const handleTotemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totemData.characterName || !totemData.llmModel || !totemData.voiceModel || !totemData.backstory) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios do personagem",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Praça e totem criados com sucesso!",
      description: `${squareData.name} foi criada com o personagem ${totemData.characterName}`,
    });

    // Reset forms
    setSquareData({ name: '', location: '' });
    setTotemData({
      characterName: '',
      llmModel: '',
      voiceModel: '',
      backstory: '',
      contextFiles: [],
      backgroundImages: [],
      mediaFiles: []
    });
    setStep('square');
  };

  const handleFileUpload = (files: FileList | null, type: 'context' | 'background' | 'media') => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setTotemData(prev => ({
      ...prev,
      [`${type}Files`]: [...prev[`${type}Files` as keyof typeof prev] as File[], ...fileArray]
    }));

    toast({
      title: "Arquivos adicionados",
      description: `${fileArray.length} arquivo(s) de ${type === 'context' ? 'contexto' : type === 'background' ? 'fundo' : 'mídia'} adicionado(s)`,
    });
  };

  const duplicateTotem = () => {
    toast({
      title: "Totem duplicado",
      description: "Um novo totem foi criado com as mesmas configurações",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header user={user} onLogout={onLogout} />
      
      <main className="container py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1 h-auto"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-foreground">
            {step === 'square' ? 'Nova Praça' : 'Novo Totem'}
          </span>
        </div>

        {/* Progress */}
        <Card className="gradient-card shadow-card border-border p-4">
          <div className="flex items-center justify-center gap-8">
            <div className={`flex items-center gap-2 ${step === 'square' ? 'text-primary' : 'text-success'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'square' ? 'bg-primary text-primary-foreground' : 'bg-success text-white'}`}>
                {step === 'square' ? '1' : '✓'}
              </div>
              <span className="font-medium">Criar Praça</span>
            </div>
            <div className={`w-12 h-px ${step === 'totem' ? 'bg-primary' : 'bg-border'}`} />
            <div className={`flex items-center gap-2 ${step === 'totem' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'totem' ? 'bg-primary text-primary-foreground' : 'bg-border'}`}>
                2
              </div>
              <span className="font-medium">Configurar Totem</span>
            </div>
          </div>
        </Card>

        {step === 'square' ? (
          /* Square Creation Form */
          <Card className="gradient-card shadow-card border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Criar Nova Praça</h1>
            </div>

            <form onSubmit={handleSquareSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="square-name">Nome da Praça *</Label>
                  <Input
                    id="square-name"
                    placeholder="Ex: Shopping Center Norte"
                    value={squareData.name}
                    onChange={(e) => setSquareData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square-location">Localização *</Label>
                  <Input
                    id="square-location"
                    placeholder="Ex: São Paulo, SP"
                    value={squareData.location}
                    onChange={(e) => setSquareData(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-gradient-primary hover:shadow-glow px-8">
                  Continuar para Totem
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          /* Totem Configuration Form */
          <div className="space-y-6">
            <Card className="gradient-card shadow-card border-border p-4">
              <div className="text-sm text-muted-foreground">
                Criando totem para: <span className="text-foreground font-medium">{squareData.name}</span> - {squareData.location}
              </div>
            </Card>

            <form onSubmit={handleTotemSubmit} className="space-y-6">
              {/* Character Configuration */}
              <Card className="gradient-card shadow-card border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Configuração do Personagem</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="character-name">Nome do Personagem *</Label>
                    <Input
                      id="character-name"
                      placeholder="Ex: Ana Virtual"
                      value={totemData.characterName}
                      onChange={(e) => setTotemData(prev => ({ ...prev, characterName: e.target.value }))}
                      className="bg-muted border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="llm-model">Modelo de LLM *</Label>
                    <Select value={totemData.llmModel} onValueChange={(value) => setTotemData(prev => ({ ...prev, llmModel: value }))}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {llmModels.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voice-model">Modelo de Voz *</Label>
                    <Select value={totemData.voiceModel} onValueChange={(value) => setTotemData(prev => ({ ...prev, voiceModel: value }))}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Selecione a voz" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceModels.map((voice) => (
                          <SelectItem key={voice.value} value={voice.value}>
                            {voice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="backstory">Backstory do Personagem *</Label>
                    <Textarea
                      id="backstory"
                      placeholder="Descreva a personalidade, função e comportamento do personagem..."
                      value={totemData.backstory}
                      onChange={(e) => setTotemData(prev => ({ ...prev, backstory: e.target.value }))}
                      className="bg-muted border-border min-h-24"
                    />
                  </div>
                </div>
              </Card>

              {/* RAG Configuration */}
              <Card className="gradient-card shadow-card border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">RAG - Contexto</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Documentos de Contexto</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload de documentos, PDFs, textos que o personagem deve conhecer
                    </p>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => handleFileUpload(e.target.files, 'context')}
                        className="hidden"
                        id="context-upload"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => document.getElementById('context-upload')?.click()}
                      >
                        Selecionar Documentos
                      </Button>
                      {totemData.contextFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {totemData.contextFiles.length} arquivo(s) selecionado(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Media Configuration */}
              <Card className="gradient-card shadow-card border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Image className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Mídia e Imagens</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Imagens de Fundo</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Imagens que aparecem atrás do personagem por assunto
                    </p>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Image className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files, 'background')}
                        className="hidden"
                        id="background-upload"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('background-upload')?.click()}
                      >
                        Selecionar Imagens
                      </Button>
                      {totemData.backgroundImages.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {totemData.backgroundImages.length} imagem(ns)
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Mídias Individuais</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vídeos específicos para este totem
                    </p>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Video className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <Input
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files, 'media')}
                        className="hidden"
                        id="media-upload"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('media-upload')?.click()}
                      >
                        Selecionar Vídeos
                      </Button>
                      {totemData.mediaFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {totemData.mediaFiles.length} vídeo(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setStep('square')}
                >
                  Voltar
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={duplicateTotem}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicar Totem
                  </Button>
                  <Button type="submit" className="bg-gradient-primary hover:shadow-glow px-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Totem
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};