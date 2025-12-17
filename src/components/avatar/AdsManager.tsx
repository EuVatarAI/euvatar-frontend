import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, GripVertical, Play, Pause, Save } from 'lucide-react';

interface Ad {
  id: string;
  media_url: string;
  duration: number;
  display_order: number;
  name: string | null;
}

interface AdsManagerProps {
  avatarId: string;
}

interface PendingAd {
  file: File;
  previewUrl: string;
  name: string;
  duration: number;
  storagePath: string;
  publicUrl: string;
}

export const AdsManager = ({ avatarId }: AdsManagerProps) => {
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newAdName, setNewAdName] = useState('');
  const [newAdDuration, setNewAdDuration] = useState<string>('15');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [pendingAd, setPendingAd] = useState<PendingAd | null>(null);
  const [savingAd, setSavingAd] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    fetchAds();
  }, [avatarId]);

  useEffect(() => {
    return () => {
      if (pendingAd?.previewUrl) {
        URL.revokeObjectURL(pendingAd.previewUrl);
      }
    };
  }, [pendingAd]);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('avatar_ads')
        .select('*')
        .eq('avatar_id', avatarId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error('Error fetching ads:', error);
      toast({ title: 'Erro ao carregar anúncios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error('Erro ao carregar vídeo'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video duration
    try {
      const duration = await getVideoDuration(file);
      const maxDuration = parseInt(newAdDuration);

      if (duration > 30) {
        toast({ 
          title: 'Vídeo muito longo', 
          description: 'Seu vídeo deve ter até 30 segundos.',
          variant: 'destructive' 
        });
        e.target.value = '';
        return;
      }

      if (maxDuration === 15 && duration > 15) {
        toast({ 
          title: 'Duração incompatível', 
          description: 'Selecione a opção 30 segundos.',
          variant: 'destructive' 
        });
        e.target.value = '';
        return;
      }
    } catch (error) {
      toast({ title: 'Erro ao verificar vídeo', variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const storagePath = `${avatarId}/ads/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatar-media')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatar-media')
        .getPublicUrl(storagePath);

      const previewUrl = URL.createObjectURL(file);
      
      setPendingAd({
        file,
        previewUrl,
        name: newAdName || file.name,
        duration: parseInt(newAdDuration),
        storagePath,
        publicUrl,
      });
      
      setNewAdName('');
    } catch (error: any) {
      console.error('Error uploading ad:', error);
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const savePendingAd = async () => {
    if (!pendingAd) return;
    
    setSavingAd(true);
    try {
      const maxOrder = ads.length > 0 ? Math.max(...ads.map(a => a.display_order)) : -1;

      const { error: insertError } = await supabase
        .from('avatar_ads')
        .insert({
          avatar_id: avatarId,
          media_url: pendingAd.publicUrl,
          duration: pendingAd.duration,
          display_order: maxOrder + 1,
          name: pendingAd.name,
        });

      if (insertError) throw insertError;

      URL.revokeObjectURL(pendingAd.previewUrl);
      setPendingAd(null);
      toast({ title: 'Anúncio salvo!' });
      fetchAds();
    } catch (error: any) {
      console.error('Error saving ad:', error);
      toast({ title: 'Erro ao salvar anúncio', variant: 'destructive' });
    } finally {
      setSavingAd(false);
    }
  };

  const cancelPendingAd = async () => {
    if (!pendingAd) return;
    
    // Delete from storage
    try {
      await supabase.storage
        .from('avatar-media')
        .remove([pendingAd.storagePath]);
    } catch (error) {
      console.error('Error deleting from storage:', error);
    }
    
    URL.revokeObjectURL(pendingAd.previewUrl);
    setPendingAd(null);
  };

  const togglePreviewPlay = () => {
    if (previewVideoRef.current) {
      if (previewPlaying) {
        previewVideoRef.current.pause();
      } else {
        previewVideoRef.current.play();
      }
      setPreviewPlaying(!previewPlaying);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Excluir este anúncio?')) return;

    try {
      const { error } = await supabase
        .from('avatar_ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;
      toast({ title: 'Anúncio excluído!' });
      fetchAds();
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newAds = [...ads];
    const draggedAd = newAds[draggedIndex];
    newAds.splice(draggedIndex, 1);
    newAds.splice(index, 0, draggedAd);
    
    setAds(newAds);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHasOrderChanges(true);
  };

  const saveOrder = async () => {
    try {
      const updates = ads.map((ad, index) => 
        supabase
          .from('avatar_ads')
          .update({ display_order: index })
          .eq('id', ad.id)
      );
      
      await Promise.all(updates);
      setHasOrderChanges(false);
      toast({ title: 'Ordem salva!' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Erro ao salvar ordem', variant: 'destructive' });
      fetchAds();
    }
  };

  const handleVideoEnded = () => {
    const nextIndex = (currentPlayingIndex + 1) % ads.length;
    setCurrentPlayingIndex(nextIndex);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Ad Preview */}
      {pendingAd && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Preview do Anúncio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-lg overflow-hidden">
              <video
                ref={previewVideoRef}
                src={pendingAd.previewUrl}
                className="w-full h-full object-contain"
                muted
                autoPlay
                onPlay={() => setPreviewPlaying(true)}
                onPause={() => setPreviewPlaying(false)}
                controls
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {pendingAd.name} - {pendingAd.duration}s
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={togglePreviewPlay}
                className="flex-1"
              >
                {previewPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {previewPlaying ? 'Pausar' : 'Reproduzir'}
              </Button>
              <Button
                variant="destructive"
                onClick={cancelPendingAd}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
            <Button
              onClick={savePendingAd}
              disabled={savingAd}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-1" />
              {savingAd ? 'Salvando...' : 'Salvar Anúncio'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Player */}
      {ads.length > 0 && !pendingAd && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview dos Anúncios</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPlaying ? 'Pausar' : 'Reproduzir'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                key={ads[currentPlayingIndex]?.id}
                src={ads[currentPlayingIndex]?.media_url}
                className="w-full h-full object-contain"
                muted
                autoPlay
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {currentPlayingIndex + 1} de {ads.length}: {ads[currentPlayingIndex]?.name || 'Sem nome'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Form - hidden when pending ad exists */}
      {!pendingAd && (
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Anúncio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ad-name">Nome do Anúncio</Label>
              <Input
                id="ad-name"
                value={newAdName}
                onChange={(e) => setNewAdName(e.target.value)}
                placeholder="Ex: Promo Verão"
              />
            </div>
            <div>
              <Label htmlFor="ad-duration">Duração Máxima</Label>
              <Select value={newAdDuration} onValueChange={setNewAdDuration}>
                <SelectTrigger id="ad-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Até 15 segundos</SelectItem>
                  <SelectItem value="30">Até 30 segundos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <input
              type="file"
              id="ad-upload"
              accept="video/*"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('ad-upload')?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Enviando...' : 'Upload de Vídeo Vertical'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formato recomendado: 9:16 (vertical), MP4 ou WebM
          </p>
        </CardContent>
      </Card>
      )}

      {/* Ads List */}
      <Card>
        <CardHeader>
          <CardTitle>Fila de Anúncios ({ads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum anúncio adicionado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {ads.map((ad, index) => (
                <div
                  key={ad.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move transition-all ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${currentPlayingIndex === index && isPlaying ? 'ring-2 ring-primary' : ''}`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="w-16 h-28 bg-muted rounded overflow-hidden flex-shrink-0">
                    <video
                      src={ad.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ad.name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{ad.duration}s</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ad.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Arraste para reordenar. Os anúncios rodam em loop contínuo.
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
