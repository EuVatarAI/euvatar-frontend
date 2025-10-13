import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, Check, X } from "lucide-react";
import { sanitizeContextName } from "@/utils/contextNameSanitizer";
import { validateMediaUrlClient } from "@/utils/mediaValidation";

interface Context {
  id: string;
  name: string;
  description: string;
  media_url: string;
  media_type: string;
  enabled: boolean;
  placement: string;
  size: string;
}

export default function AvatarContexts() {
  const { avatarId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaValid, setMediaValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Test state
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadContexts();
  }, [avatarId]);

  const loadContexts = async () => {
    if (!avatarId) return;
    
    const { data, error } = await supabase
      .from("contexts")
      .select("*")
      .eq("avatar_id", avatarId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar contextos", variant: "destructive" });
    } else {
      setContexts(data || []);
    }
    setLoading(false);
  };

  const handleNameChange = (value: string) => {
    const sanitized = sanitizeContextName(value);
    setName(sanitized);
  };

  const handleMediaUrlChange = async (value: string) => {
    setMediaUrl(value);
    setMediaValid(null);
    
    if (!value.trim()) return;
    
    setValidating(true);
    const clientCheck = await validateMediaUrlClient(value);
    
    if (clientCheck.ok) {
      try {
        const response = await fetch(
          `https://aqbyqtvaxjroakgnxlun.supabase.co/functions/v1/validate-media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: value }),
          }
        );
        const serverCheck = await response.json();
        setMediaValid(serverCheck.ok);
      } catch {
        setMediaValid(false);
      }
    } else {
      setMediaValid(false);
    }
    setValidating(false);
  };

  const handleSave = async () => {
    if (!name || !description || !mediaUrl) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    if (!mediaValid) {
      toast({ title: "Mídia inválida", variant: "destructive" });
      return;
    }

    const mediaType = mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" : "image";

    const payload = {
      avatar_id: avatarId,
      name,
      description,
      media_url: mediaUrl,
      media_type: mediaType,
      enabled: true,
    };

    let error;
    if (editingId) {
      const result = await supabase
        .from("contexts")
        .update(payload)
        .eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("contexts").insert(payload);
      error = result.error;
    }

    if (error) {
      toast({ title: "Erro ao salvar contexto", variant: "destructive" });
    } else {
      toast({ title: "Contexto salvo com sucesso!" });
      resetForm();
      loadContexts();
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setMediaUrl("");
    setMediaValid(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (ctx: Context) => {
    setName(ctx.name);
    setDescription(ctx.description);
    setMediaUrl(ctx.media_url);
    setMediaValid(true);
    setEditingId(ctx.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contexts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Contexto excluído" });
      loadContexts();
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("contexts")
      .update({ enabled: !enabled })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      loadContexts();
    }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) return;
    
    setTesting(true);
    try {
      const response = await fetch(
        `https://aqbyqtvaxjroakgnxlun.supabase.co/functions/v1/match-context`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatar_id: avatarId,
            user_message: testQuery,
          }),
        }
      );
      const result = await response.json();
      setTestResult(result.context_name || "none");
    } catch {
      toast({ title: "Erro ao testar", variant: "destructive" });
    }
    setTesting(false);
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Contextos</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contexto
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Editar" : "Novo"} Contexto
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome do contexto</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ex: apto_3_quartos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contexto (texto livre)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Quando o usuário pedir apartamento de 3 quartos..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL da Mídia</label>
              <Input
                value={mediaUrl}
                onChange={(e) => handleMediaUrlChange(e.target.value)}
                placeholder="https://..."
                className={mediaValid === false ? "border-red-500" : ""}
              />
              {validating && <p className="text-sm text-muted-foreground mt-1">Validando...</p>}
              {mediaValid === true && (
                <div className="mt-2">
                  <p className="text-sm text-green-600 mb-2">✓ Mídia válida - Preview:</p>
                  <img src={mediaUrl} alt="Preview" className="max-w-xs rounded border" />
                </div>
              )}
              {mediaValid === false && (
                <p className="text-sm text-red-600 mt-1">✗ Mídia inválida</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!mediaValid}>
                Salvar
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Testar Contextos</h2>
        <div className="flex gap-2">
          <Input
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Digite uma pergunta: ex: tem apartamento de 3 quartos?"
          />
          <Button onClick={handleTest} disabled={testing}>
            <Eye className="mr-2 h-4 w-4" />
            Testar
          </Button>
        </div>
        {testResult && (
          <div className="mt-4">
            <p className="font-medium">
              Contexto acionado: <span className="text-primary">{testResult}</span>
            </p>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {contexts.map((ctx) => (
          <Card key={ctx.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{ctx.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{ctx.description}</p>
                <div className="mt-2">
                  <img src={ctx.media_url} alt={ctx.name} className="max-w-[200px] rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant={ctx.enabled ? "default" : "outline"}
                  onClick={() => handleToggleEnabled(ctx.id, ctx.enabled)}
                >
                  {ctx.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => handleEdit(ctx)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(ctx.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
