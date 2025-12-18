import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

import { useToast } from '@/hooks/use-toast';
import { Trash2, Play, Upload, ExternalLink, GripVertical, Save, Pencil, Monitor, Smartphone, X, Eye } from 'lucide-react';

interface AvatarButton {
  id: string;
  label: string;
  action_type: 'session_start' | 'video_upload' | 'external_link';
  external_url: string | null;
  video_url: string | null;
  size: 'small' | 'medium' | 'large';
  color: string;
  position_x: number;
  position_y: number;
  display_order: number;
  enabled: boolean;
  border_style: 'square' | 'rounded' | 'pill';
  font_family: string;
  font_size: number;
}

interface ButtonsManagerProps {
  avatarId: string;
}

const ACTION_LABELS = {
  session_start: 'Iniciar Sessão',
  video_upload: 'Upload de Vídeo',
  external_link: 'Link Externo',
};

// Dynamic padding based on font size
const getPadding = (fontSize: number) => {
  const paddingX = Math.max(12, Math.round(fontSize * 0.8));
  const paddingY = Math.max(6, Math.round(fontSize * 0.4));
  return { paddingX, paddingY };
};

const BORDER_CONFIG = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Lato', label: 'Lato' },
];

// Sample video URLs for preview
const SAMPLE_VIDEOS = {
  vertical: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  horizontal: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export const ButtonsManager = ({ avatarId }: ButtonsManagerProps) => {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const [buttons, setButtons] = useState<AvatarButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingButton, setEditingButton] = useState<Partial<AvatarButton> | null>(null);
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const [testPopupUrl, setTestPopupUrl] = useState<string | null>(null);
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [newButton, setNewButton] = useState<{
    label: string;
    action_type: 'session_start' | 'video_upload' | 'external_link';
    external_url: string;
    video_url: string;
    size: 'small' | 'medium' | 'large';
    color: string;
    border_style: 'square' | 'rounded' | 'pill';
    font_family: string;
    font_size: number;
    position_x: number;
    position_y: number;
  }>({
    label: 'Conversar',
    action_type: 'session_start',
    external_url: '',
    video_url: '',
    size: 'medium',
    color: '#6366f1',
    border_style: 'rounded',
    font_family: 'Inter',
    font_size: 16,
    position_x: 50,
    position_y: 85,
  });

  useEffect(() => {
    fetchButtons();
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;500;600;700&family=Lato:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
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

  const handleSaveNewButton = async () => {
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
          video_url: newButton.action_type === 'video_upload' ? newButton.video_url : null,
          size: newButton.size,
          color: newButton.color,
          border_style: newButton.border_style,
          font_family: newButton.font_family,
          font_size: newButton.font_size,
          position_x: newButton.position_x,
          position_y: newButton.position_y,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      setNewButton({
        label: 'Conversar',
        action_type: 'session_start',
        external_url: '',
        video_url: '',
        size: 'medium',
        color: '#6366f1',
        border_style: 'rounded',
        font_family: 'Inter',
        font_size: 16,
        position_x: 50,
        position_y: 85,
      });

      toast({ title: 'Botão salvo!' });
      fetchButtons();
    } catch (error: any) {
      console.error('Error saving button:', error);
      toast({ title: 'Erro ao salvar botão', variant: 'destructive' });
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
          external_url: button.action_type === 'external_link' ? button.external_url : null,
          video_url: button.action_type === 'video_upload' ? button.video_url : null,
          size: button.size,
          color: button.color,
          border_style: button.border_style,
          font_family: button.font_family,
          font_size: button.font_size,
          position_x: button.position_x,
          position_y: button.position_y,
          enabled: button.enabled,
        })
        .eq('id', button.id);

      if (error) throw error;
      setEditingButton(null);
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

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    if (!previewRef.current) return;
    setIsDraggingButton(true);
    updateButtonPosition(e);
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingButton || !previewRef.current) return;
    updateButtonPosition(e);
  };

  const handlePreviewMouseUp = () => {
    setIsDraggingButton(false);
  };

  const updateButtonPosition = (e: React.MouseEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    
    if (editingButton) {
      setEditingButton({ ...editingButton, position_x: Math.round(x), position_y: Math.round(y) });
    } else {
      setNewButton({ ...newButton, position_x: Math.round(x), position_y: Math.round(y) });
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

  const renderButtonPreview = (btn: typeof newButton | AvatarButton, isEditing = false) => {
    const borderConfig = BORDER_CONFIG[btn.border_style];
    const fontSize = 'font_size' in btn ? btn.font_size : 16;
    const { paddingX, paddingY } = getPadding(fontSize);
    
    return (
      <button
        className={`font-medium transition-all shadow-lg ${borderConfig}`}
        style={{
          backgroundColor: btn.color,
          color: 'white',
          fontFamily: btn.font_family,
          fontSize: `${fontSize}px`,
          padding: `${paddingY}px ${paddingX}px`,
          position: 'absolute',
          left: `${btn.position_x}%`,
          top: `${btn.position_y}%`,
          transform: 'translate(-50%, -50%)',
          cursor: isEditing ? 'move' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {btn.label || 'Texto do Botão'}
      </button>
    );
  };

  const currentButton = editingButton || newButton;

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Video Orientation Selector */}
      <div className="flex justify-center gap-2">
        <Button
          variant={videoOrientation === 'vertical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVideoOrientation('vertical')}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Vertical
        </Button>
        <Button
          variant={videoOrientation === 'horizontal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVideoOrientation('horizontal')}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Horizontal
        </Button>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview em Tempo Real</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={`mx-auto bg-black rounded-lg overflow-hidden relative ${
              videoOrientation === 'vertical' ? 'aspect-[9/16] max-w-xs' : 'aspect-video max-w-2xl'
            }`}
            ref={previewRef}
            onMouseDown={!testPopupUrl && !testVideoUrl ? handlePreviewMouseDown : undefined}
            onMouseMove={!testPopupUrl && !testVideoUrl ? handlePreviewMouseMove : undefined}
            onMouseUp={!testPopupUrl && !testVideoUrl ? handlePreviewMouseUp : undefined}
            onMouseLeave={!testPopupUrl && !testVideoUrl ? handlePreviewMouseUp : undefined}
          >
            {/* Test Link Preview */}
            {testPopupUrl ? (
              <div className="absolute inset-0 z-20">
                <iframe
                  src={testPopupUrl}
                  className="w-full h-full border-0"
                  title="Teste de Link Externo"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 z-30"
                  onClick={() => setTestPopupUrl(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Fechar Teste
                </Button>
              </div>
            ) : testVideoUrl ? (
              /* Test Video Preview */
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                <video
                  src={testVideoUrl}
                  className="max-w-full max-h-full object-contain"
                  autoPlay
                  controls
                  onEnded={() => setTestVideoUrl(null)}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 z-30"
                  onClick={() => setTestVideoUrl(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Fechar Teste
                </Button>
              </div>
            ) : (
              /* Normal Preview */
              <>
                <video
                  src={SAMPLE_VIDEOS[videoOrientation]}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                
                {/* Show current editing/new button */}
                <div className="absolute inset-0 pointer-events-none">
                  {renderButtonPreview(currentButton as any, true)}
                </div>
                
                {/* Show saved buttons (dimmed when editing) */}
                {buttons.filter(b => b.enabled && (!editingButton || b.id !== editingButton.id)).map((btn) => (
                  <div key={btn.id} className={`absolute inset-0 pointer-events-none ${editingButton ? 'opacity-30' : ''}`}>
                    {renderButtonPreview(btn)}
                  </div>
                ))}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {testPopupUrl ? 'Visualizando teste do link externo' : testVideoUrl ? 'Visualizando teste do vídeo' : 'Clique e arraste para posicionar o botão'}
          </p>
        </CardContent>
      </Card>

      {/* Button Editor */}
      <Card>
        <CardHeader>
          <CardTitle>{editingButton ? 'Editar Botão' : 'Novo Botão'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Texto do Botão</Label>
              <Input
                value={currentButton.label}
                onChange={(e) => editingButton 
                  ? setEditingButton({ ...editingButton, label: e.target.value })
                  : setNewButton({ ...newButton, label: e.target.value })
                }
                placeholder="Ex: Conversar"
              />
            </div>
            <div>
              <Label>Ação</Label>
              <Select 
                value={currentButton.action_type} 
                onValueChange={(v: any) => editingButton
                  ? setEditingButton({ ...editingButton, action_type: v })
                  : setNewButton({ ...newButton, action_type: v })
                }
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

          {currentButton.action_type === 'external_link' && (
            <div className="space-y-2">
              <Label>URL do Link</Label>
              <div className="flex gap-2">
                <Input
                  value={currentButton.external_url || ''}
                  onChange={(e) => editingButton
                    ? setEditingButton({ ...editingButton, external_url: e.target.value })
                    : setNewButton({ ...newButton, external_url: e.target.value })
                  }
                  placeholder="https://exemplo.com"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = currentButton.external_url || '';
                    if (url) {
                      // Add https if missing
                      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                      setTestPopupUrl(fullUrl);
                    } else {
                      toast({ title: 'Digite uma URL para testar', variant: 'destructive' });
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Testar
                </Button>
              </div>
            </div>
          )}

          {currentButton.action_type === 'video_upload' && (
            <div className="space-y-3">
              <Label>Vídeo a ser Exibido</Label>
              {(editingButton?.video_url || newButton.video_url) ? (
                <div className="space-y-2">
                  <video
                    src={editingButton ? editingButton.video_url! : newButton.video_url}
                    className="w-full max-h-40 rounded-lg object-contain bg-black"
                    controls
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const videoUrl = editingButton?.video_url || newButton.video_url;
                        if (videoUrl) {
                          setTestVideoUrl(videoUrl);
                        }
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Testar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editingButton) {
                          setEditingButton({ ...editingButton, video_url: null });
                        } else {
                          setNewButton({ ...newButton, video_url: '' });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('button-video-upload')?.click()}
                      disabled={uploadingVideo}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Trocar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('button-video-upload')?.click()}
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? 'Enviando...' : 'Selecionar Vídeo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Este vídeo será exibido quando o usuário clicar no botão
                  </p>
                </div>
              )}
              <input
                type="file"
                id="button-video-upload"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setUploadingVideo(true);
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `button-videos/${avatarId}/${Date.now()}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('avatar-media')
                      .upload(fileName, file);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                      .from('avatar-media')
                      .getPublicUrl(fileName);
                    
                    if (editingButton) {
                      setEditingButton({ ...editingButton, video_url: publicUrl });
                    } else {
                      setNewButton({ ...newButton, video_url: publicUrl });
                    }
                    
                    toast({ title: 'Vídeo enviado!' });
                  } catch (err: any) {
                    console.error('Upload error:', err);
                    toast({ title: 'Erro no upload', variant: 'destructive' });
                  } finally {
                    setUploadingVideo(false);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          )}

          {currentButton.action_type === 'session_start' && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Play className="h-4 w-4 inline mr-1" />
                Quando o usuário clicar neste botão, iniciará uma sessão interativa com o avatar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tamanho da Fonte: {currentButton.font_size || 16}px</Label>
              <Slider
                value={[currentButton.font_size || 16]}
                onValueChange={(v) => editingButton
                  ? setEditingButton({ ...editingButton, font_size: v[0] })
                  : setNewButton({ ...newButton, font_size: v[0] })
                }
                min={12}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Formato</Label>
              <Select 
                value={currentButton.border_style} 
                onValueChange={(v: any) => editingButton
                  ? setEditingButton({ ...editingButton, border_style: v })
                  : setNewButton({ ...newButton, border_style: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Quadrado</SelectItem>
                  <SelectItem value="rounded">Arredondado</SelectItem>
                  <SelectItem value="pill">Pill (Totalmente Redondo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Fonte</Label>
            <Select 
              value={currentButton.font_family} 
              onValueChange={(v) => editingButton
                ? setEditingButton({ ...editingButton, font_family: v })
                : setNewButton({ ...newButton, font_family: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={currentButton.color}
                  onChange={(e) => editingButton
                    ? setEditingButton({ ...editingButton, color: e.target.value })
                    : setNewButton({ ...newButton, color: e.target.value })
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={currentButton.color}
                  onChange={(e) => editingButton
                    ? setEditingButton({ ...editingButton, color: e.target.value })
                    : setNewButton({ ...newButton, color: e.target.value })
                  }
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <div>
              <Label>Posição X (%)</Label>
              <Input
                type="number"
                min={5}
                max={95}
                value={currentButton.position_x}
                onChange={(e) => editingButton
                  ? setEditingButton({ ...editingButton, position_x: parseInt(e.target.value) || 50 })
                  : setNewButton({ ...newButton, position_x: parseInt(e.target.value) || 50 })
                }
              />
            </div>
            <div>
              <Label>Posição Y (%)</Label>
              <Input
                type="number"
                min={5}
                max={95}
                value={currentButton.position_y}
                onChange={(e) => editingButton
                  ? setEditingButton({ ...editingButton, position_y: parseInt(e.target.value) || 85 })
                  : setNewButton({ ...newButton, position_y: parseInt(e.target.value) || 85 })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            {editingButton ? (
              <>
                <Button 
                  onClick={() => handleUpdateButton(editingButton as AvatarButton)} 
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Button variant="outline" onClick={() => setEditingButton(null)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveNewButton} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Botão'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buttons List */}
      <Card>
        <CardHeader>
          <CardTitle>Botões Salvos ({buttons.length})</CardTitle>
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
                    className={`w-20 h-8 flex items-center justify-center text-white text-xs font-medium ${BORDER_CONFIG[button.border_style]}`}
                    style={{ backgroundColor: button.color, fontFamily: button.font_family }}
                  >
                    {button.label.slice(0, 10)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{button.label}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {getActionIcon(button.action_type)}
                      {ACTION_LABELS[button.action_type]}
                    </p>
                  </div>
                  
                  <Switch
                    checked={button.enabled}
                    onCheckedChange={() => handleToggleEnabled(button)}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingButton(button)}
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
