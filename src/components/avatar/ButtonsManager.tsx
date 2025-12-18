import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Play, Upload, ExternalLink, GripVertical, Save, Pencil } from 'lucide-react';

interface AvatarButton {
  id: string;
  label: string;
  action_type: 'session_start' | 'video_upload' | 'external_link';
  external_url: string | null;
  size: 'small' | 'medium' | 'large';
  color: string;
  position_x: number;
  position_y: number;
  display_order: number;
  enabled: boolean;
}

interface ButtonsManagerProps {
  avatarId: string;
}

const ACTION_LABELS = {
  session_start: 'Iniciar Sessão',
  video_upload: 'Upload de Vídeo',
  external_link: 'Link Externo',
};

const SIZE_LABELS = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};

const SIZE_CLASSES = {
  small: 'px-3 py-1 text-sm',
  medium: 'px-4 py-2 text-base',
  large: 'px-6 py-3 text-lg',
};

export const ButtonsManager = ({ avatarId }: ButtonsManagerProps) => {
  const { toast } = useToast();
  const [buttons, setButtons] = useState<AvatarButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [newButton, setNewButton] = useState<{
    label: string;
    action_type: 'session_start' | 'video_upload' | 'external_link';
    external_url: string;
    size: 'small' | 'medium' | 'large';
    color: string;
  }>({
    label: '',
    action_type: 'session_start',
    external_url: '',
    size: 'medium',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchButtons();
  }, [avatarId]);

  const fetchButtons = async () => {
    try {
      const { data, error } = await supabase
        .from('avatar_buttons')
        .select('*')
        .eq('avatar_id', avatarId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setButtons((data || []) as AvatarButton[]);
    } catch (error: any) {
      console.error('Error fetching buttons:', error);
      toast({ title: 'Erro ao carregar botões', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddButton = async () => {
    if (!newButton.label) {
      toast({ title: 'Digite o texto do botão', variant: 'destructive' });
      return;
    }

    if (newButton.action_type === 'external_link' && !newButton.external_url) {
      toast({ title: 'Digite a URL do link', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const maxOrder = buttons.length > 0 ? Math.max(...buttons.map(b => b.display_order)) : -1;

      const { error } = await supabase
        .from('avatar_buttons')
        .insert({
          avatar_id: avatarId,
          label: newButton.label,
          action_type: newButton.action_type,
          external_url: newButton.action_type === 'external_link' ? newButton.external_url : null,
          size: newButton.size,
          color: newButton.color,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      setNewButton({
        label: '',
        action_type: 'session_start',
        external_url: '',
        size: 'medium',
        color: '#6366f1',
      });

      toast({ title: 'Botão adicionado!' });
      fetchButtons();
    } catch (error: any) {
      console.error('Error adding button:', error);
      toast({ title: 'Erro ao adicionar botão', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateButton = async (button: AvatarButton) => {
    try {
      const { error } = await supabase
        .from('avatar_buttons')
        .update({
          label: button.label,
          action_type: button.action_type,
          external_url: button.external_url,
          size: button.size,
          color: button.color,
          enabled: button.enabled,
        })
        .eq('id', button.id);

      if (error) throw error;
      setEditingId(null);
      toast({ title: 'Botão atualizado!' });
      fetchButtons();
    } catch (error: any) {
      console.error('Error updating button:', error);
      toast({ title: 'Erro ao atualizar botão', variant: 'destructive' });
    }
  };

  const handleDeleteButton = async (buttonId: string) => {
    if (!confirm('Excluir este botão?')) return;

    try {
      const { error } = await supabase
        .from('avatar_buttons')
        .delete()
        .eq('id', buttonId);

      if (error) throw error;
      toast({ title: 'Botão excluído!' });
      fetchButtons();
    } catch (error: any) {
      console.error('Error deleting button:', error);
      toast({ title: 'Erro ao excluir botão', variant: 'destructive' });
    }
  };

  const handleToggleEnabled = async (button: AvatarButton) => {
    try {
      const { error } = await supabase
        .from('avatar_buttons')
        .update({ enabled: !button.enabled })
        .eq('id', button.id);

      if (error) throw error;
      fetchButtons();
    } catch (error: any) {
      console.error('Error toggling button:', error);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newButtons = [...buttons];
    const draggedButton = newButtons[draggedIndex];
    newButtons.splice(draggedIndex, 1);
    newButtons.splice(index, 0, draggedButton);

    setButtons(newButtons);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHasOrderChanges(true);
  };

  const saveOrder = async () => {
    try {
      const updates = buttons.map((button, index) =>
        supabase
          .from('avatar_buttons')
          .update({ display_order: index })
          .eq('id', button.id)
      );

      await Promise.all(updates);
      setHasOrderChanges(false);
      toast({ title: 'Ordem salva!' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Erro ao salvar ordem', variant: 'destructive' });
      fetchButtons();
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'session_start':
        return <Play className="h-4 w-4" />;
      case 'video_upload':
        return <Upload className="h-4 w-4" />;
      case 'external_link':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview dos Botões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Área do vídeo idle
            </div>
            <div className="absolute inset-0 flex flex-wrap items-end justify-center gap-2 p-4">
              {buttons.filter(b => b.enabled).map((button) => (
                <button
                  key={button.id}
                  className={`rounded-lg font-medium transition-all ${SIZE_CLASSES[button.size]}`}
                  style={{ backgroundColor: button.color, color: 'white' }}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Button Form */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Botão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Texto do Botão</Label>
              <Input
                value={newButton.label}
                onChange={(e) => setNewButton({ ...newButton, label: e.target.value })}
                placeholder="Ex: Conversar"
              />
            </div>
            <div>
              <Label>Ação</Label>
              <Select 
                value={newButton.action_type} 
                onValueChange={(v) => setNewButton({ ...newButton, action_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session_start">Iniciar Sessão</SelectItem>
                  <SelectItem value="video_upload">Upload de Vídeo</SelectItem>
                  <SelectItem value="external_link">Link Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {newButton.action_type === 'external_link' && (
            <div>
              <Label>URL do Link</Label>
              <Input
                value={newButton.external_url}
                onChange={(e) => setNewButton({ ...newButton, external_url: e.target.value })}
                placeholder="https://exemplo.com"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tamanho</Label>
              <Select 
                value={newButton.size} 
                onValueChange={(v) => setNewButton({ ...newButton, size: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newButton.color}
                  onChange={(e) => setNewButton({ ...newButton, color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={newButton.color}
                  onChange={(e) => setNewButton({ ...newButton, color: e.target.value })}
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleAddButton} disabled={saving} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {saving ? 'Adicionando...' : 'Adicionar Botão'}
          </Button>
        </CardContent>
      </Card>

      {/* Buttons List */}
      <Card>
        <CardHeader>
          <CardTitle>Botões Configurados ({buttons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {buttons.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum botão configurado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {buttons.map((button, index) => (
                <div
                  key={button.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move transition-all ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${!button.enabled ? 'opacity-60' : ''}`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  
                  <div
                    className="w-8 h-8 rounded flex-shrink-0"
                    style={{ backgroundColor: button.color }}
                  />
                  
                  {editingId === button.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={button.label}
                        onChange={(e) => {
                          const updated = buttons.map(b => 
                            b.id === button.id ? { ...b, label: e.target.value } : b
                          );
                          setButtons(updated);
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateButton(button)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{button.label}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {getActionIcon(button.action_type)}
                          {ACTION_LABELS[button.action_type]}
                          {button.action_type === 'external_link' && button.external_url && (
                            <span className="text-xs truncate max-w-32">
                              ({button.external_url})
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <span className="text-xs text-muted-foreground">
                        {SIZE_LABELS[button.size]}
                      </span>
                      
                      <Switch
                        checked={button.enabled}
                        onCheckedChange={() => handleToggleEnabled(button)}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(button.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteButton(button.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-4">
            Arraste para reordenar. Ative/desative para mostrar/ocultar.
          </p>
          
          {hasOrderChanges && (
            <Button onClick={saveOrder} className="w-full mt-4">
              <Save className="mr-2 h-4 w-4" />
              Salvar Ordem
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
