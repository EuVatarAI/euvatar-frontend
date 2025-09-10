import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  ArrowLeft, 
  Play, 
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  duration: number;
  size: string;
  status: 'uploading' | 'ready' | 'error';
  preview?: string;
}

const mockSquares = [
  { id: "1", name: "Aeroporto Brasília", totems: 8 },
  { id: "2", name: "Parque Olímpico RJ", totems: 12 },
  { id: "3", name: "Shopping Center Norte", totems: 6 },
];

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

interface MediaUploadProps {
  user: {
    name: string;
    email: string;
  };
  organization: Organization | null;
  profile: Profile | null;
  onLogout: () => void;
  onBack: () => void;
}

export const MediaUpload = ({ user, organization, profile, onLogout, onBack }: MediaUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [selectedSquares, setSelectedSquares] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const newFile: MediaFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        duration: Math.floor(Math.random() * 60) + 15, // Mock duration
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, newFile]);

      // Simulate upload process
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: 'ready' as const }
              : f
          )
        );
      }, 2000);
    });

    toast({
      title: "Upload iniciado",
      description: `${files.length} arquivo(s) sendo processado(s)`,
    });
  };

  const handleSquareSelection = (squareId: string, checked: boolean) => {
    if (checked) {
      setSelectedSquares(prev => [...prev, squareId]);
    } else {
      setSelectedSquares(prev => prev.filter(id => id !== squareId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedSquares(mockSquares.map(s => s.id));
    } else {
      setSelectedSquares([]);
    }
  };

  const handleDeploy = () => {
    if (selectedSquares.length === 0) {
      toast({
        title: "Nenhuma praça selecionada",
        description: "Selecione pelo menos uma praça para enviar as mídias",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Mídias enviadas com sucesso!",
      description: `${uploadedFiles.length} arquivo(s) enviado(s) para ${selectedSquares.length} praça(s)`,
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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
          <span className="text-foreground">Upload de Mídias</span>
        </div>

        {/* Upload Section */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            Upload Geral de Mídias
          </h1>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <Label htmlFor="video-upload" className="text-base font-medium">
                Selecionar Vídeos
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Formatos aceitos: MP4, MOV, AVI | Durações: 15s, 30s ou 1min | Orientação: Vertical
              </p>
              
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Arraste e solte seus vídeos aqui ou clique para selecionar
                </p>
                <Input
                  id="video-upload"
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  Selecionar Arquivos
                </Button>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Arquivos Carregados</h3>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {file.duration}s • {file.size}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {file.status === 'uploading' && (
                          <Badge variant="secondary">
                            <div className="w-2 h-2 bg-warning rounded-full animate-pulse mr-2" />
                            Processando
                          </Badge>
                        )}
                        {file.status === 'ready' && (
                          <Badge variant="outline" className="text-success border-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pronto
                          </Badge>
                        )}
                        {file.status === 'error' && (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Target Selection */}
        <Card className="gradient-card shadow-card border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Destino das Mídias</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium">
                Selecionar todas as praças
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockSquares.map((square) => (
                <div 
                  key={square.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id={`square-${square.id}`}
                      checked={selectedSquares.includes(square.id)}
                      onCheckedChange={(checked) => 
                        handleSquareSelection(square.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`square-${square.id}`} className="font-medium">
                      {square.name}
                    </Label>
                  </div>
                  <Badge variant="outline">
                    {square.totems} totens
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Deploy Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleDeploy}
            disabled={uploadedFiles.length === 0 || selectedSquares.length === 0}
            className="bg-gradient-primary hover:shadow-glow px-8"
          >
            Enviar Mídias ({uploadedFiles.filter(f => f.status === 'ready').length})
          </Button>
        </div>
      </main>
    </div>
  );
};