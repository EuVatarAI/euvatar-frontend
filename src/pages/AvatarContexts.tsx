import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, TestTube, Save, Eye, EyeOff } from "lucide-react";
import { validateMediaUrlClient, type ValidationResult } from "@/utils/mediaValidation";

type Context = {
  id: string;
  name: string;
  description: string;
  media_url: string;
  media_type: string;
  enabled: boolean;
  placement: string;
  size: string;
};

function sanitizeContextName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function AvatarContexts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarName, setAvatarName] = useState("");
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    media_url: "",
    media_type: "image"
  });
  
  // Validation states
  const [mediaValidation, setMediaValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Test states
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<{ context: string | null; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: avatar } = await supabase
        .from("avatars")
        .select("name")
        .eq("id", id)
        .single();
      
      if (avatar) setAvatarName(avatar.name);

      const { data } = await supabase
        .from("contexts")
        .select("*")
        .eq("avatar_id", id)
        .order("created_at", { ascending: false });
      
      if (data) setContexts(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, media_url: url }));
    setMediaValidation(null);
    
    if (debounceTimer) clearTimeout(debounceTimer);
    
    if (!url) return;
    
    const timer = setTimeout(async () => {
      setIsValidating(true);
      const result = await validateMediaUrlClient(url);
      setMediaValidation(result);
      setIsValidating(false);
      
      // Detecta tipo automaticamente
      if (result.ok && result.kind) {
        setFormData(prev => ({ ...prev, media_type: result.kind! }));
      }
    }, 400);
    
    setDebounceTimer(timer);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.media_url) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (mediaValidation && !mediaValidation.ok) {
      toast.error("Corrija a URL da mídia antes de salvar");
      return;
    }

    try {
      if (editingId) {
        await supabase
          .from("contexts")
          .update({
            name: formData.name,
            description: formData.description,
            media_url: formData.media_url,
            media_type: formData.media_type
          })
          .eq("id", editingId);
        toast.success("Contexto atualizado");
      } else {
        await supabase
          .from("contexts")
          .insert({
            avatar_id: id,
            name: formData.name,
            description: formData.description,
            media_url: formData.media_url,
            media_type: formData.media_type
          });
        toast.success("Contexto criado");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving context:", error);
      toast.error("Erro ao salvar contexto");
    }
  };

  const handleDelete = async (contextId: string) => {
    if (!confirm("Deseja realmente excluir este contexto?")) return;
    
    try {
      await supabase.from("contexts").delete().eq("id", contextId);
      toast.success("Contexto excluído");
      fetchData();
    } catch (error) {
      console.error("Error deleting context:", error);
      toast.error("Erro ao excluir contexto");
    }
  };

  const handleToggle = async (contextId: string, enabled: boolean) => {
    try {
      await supabase
        .from("contexts")
        .update({ enabled })
        .eq("id", contextId);
      fetchData();
    } catch (error) {
      console.error("Error toggling context:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleTest = async () => {
    if (!testQuestion.trim()) {
      toast.error("Digite uma pergunta para testar");
      return;
    }

    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-context", {
        body: {
          avatar_id: id,
          question: testQuestion
        }
      });

      if (error) throw error;

      setTestResult({
        context: data.matched_context,
        message: data.matched_context 
          ? `Contexto "${data.matched_context}" seria acionado`
          : "Nenhum contexto seria acionado"
      });
    } catch (error) {
      console.error("Error testing context:", error);
      toast.error("Erro ao testar contexto");
      setTestResult(null);
    } finally {
      setTestLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", media_url: "", media_type: "image" });
    setMediaValidation(null);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (context: Context) => {
    setFormData({
      name: context.name,
      description: context.description,
      media_url: context.media_url,
      media_type: context.media_type
    });
    setEditingId(context.id);
    setShowForm(true);
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/avatars")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Contextos</h1>
          <p className="text-muted-foreground">{avatarName}</p>
        </div>
      </div>

      {/* Test Section */}
      <Card className="p-4 mb-6 bg-accent/5">
        <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
          <TestTube className="h-4 w-4" />
          Testar Contextos
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma pergunta para testar (ex: tem apartamento de 3 quartos?)"
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTest()}
          />
          <Button onClick={handleTest} disabled={testLoading}>
            {testLoading ? "Testando..." : "Testar"}
          </Button>
        </div>
        {testResult && (
          <div className={`mt-3 p-3 rounded-md ${testResult.context ? "bg-green-500/10 text-green-700" : "bg-yellow-500/10 text-yellow-700"}`}>
            <p className="text-sm font-medium">{testResult.message}</p>
          </div>
        )}
      </Card>

      {/* Form */}
      {showForm ? (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Editar Contexto" : "Novo Contexto"}
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label>Nome do Contexto</Label>
              <Input
                placeholder="ex: APARTAMENTO 3 QUARTOS"
                value={formData.name}
                onChange={(e) => {
                  const sanitized = sanitizeContextName(e.target.value);
                  setFormData(prev => ({ ...prev, name: sanitized }));
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será convertido automaticamente: apartamento_3_quartos
              </p>
            </div>

            <div>
              <Label>Contexto (texto livre)</Label>
              <Textarea
                placeholder="Quando o usuário pedir apartamento de 3 quartos, mostrar a galeria com as áreas de lazer..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Mídia (URL)</Label>
              <Input
                type="url"
                placeholder="https://cdn.exemplo.com/imagem.jpg"
                value={formData.media_url}
                onChange={(e) => handleMediaUrlChange(e.target.value)}
                className={mediaValidation && !mediaValidation.ok ? "border-red-500" : ""}
              />
              
              {isValidating && (
                <p className="text-xs text-muted-foreground mt-1">Validando mídia...</p>
              )}
              
              {mediaValidation && !mediaValidation.ok && (
                <p className="text-xs text-red-500 mt-1">
                  Erro: {mediaValidation.reason}
                </p>
              )}
              
              {mediaValidation?.ok && formData.media_url && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 mb-2">✓ Mídia válida - Preview:</p>
                  {formData.media_type === "image" ? (
                    <img src={formData.media_url} alt="Preview" className="max-w-xs rounded border" />
                  ) : (
                    <video src={formData.media_url} className="max-w-xs rounded border" controls />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} className="mb-6">
          <Plus className="h-4 w-4 mr-2" />
          Novo Contexto
        </Button>
      )}

      {/* Context List */}
      <div className="space-y-3">
        {contexts.map((context) => (
          <Card key={context.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{context.name}</h3>
                  <Switch
                    checked={context.enabled}
                    onCheckedChange={(enabled) => handleToggle(context.id, enabled)}
                  />
                  {context.enabled ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{context.description}</p>
                <div className="flex gap-2">
                  {context.media_type === "image" ? (
                    <img src={context.media_url} alt={context.name} className="h-20 rounded border" />
                  ) : (
                    <video src={context.media_url} className="h-20 rounded border" />
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(context)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(context.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {contexts.length === 0 && !showForm && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Nenhum contexto criado ainda.</p>
            <p className="text-sm mt-2">Clique em "Novo Contexto" para começar.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
