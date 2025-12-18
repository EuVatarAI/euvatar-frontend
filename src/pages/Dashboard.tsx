import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Lock, User, Clock, Link, Copy, Check, Pencil } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { UnlockPasswordDialog } from '@/components/avatar/UnlockPasswordDialog';
import { AppLayout } from '@/components/layout/AppLayout';

type Avatar = Database['public']['Tables']['avatars']['Row'] & {
  cover_image_url?: string | null;
};

interface AvatarHeyGenUsage {
  avatarId: string;
  heygenAvatarId?: string;
  totalSeconds: number;
  totalMinutes: number;
  heygenCredits: number;
  euvatarCredits: number;
  sessionCount: number;
}

interface HeyGenCredits {
  euvatarCredits: number;
  heygenCredits: number;
  totalEuvatarCredits: number;
  minutesRemaining: number;
  totalMinutes: number;
  hoursRemaining: number;
  totalHours: number;
  usedEuvatarCredits: number;
  usedMinutes: number;
  percentageRemaining: number;
  error?: string;
  needsCredentialUpdate?: boolean;
  avatarUsage?: AvatarHeyGenUsage[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [heygenCredits, setHeygenCredits] = useState<HeyGenCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch avatars
      const { data: avatarsData, error: avatarsError } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', user?.id);

      if (avatarsError) throw avatarsError;
      setAvatars(avatarsData || []);

      // Fetch organization slug
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('slug')
        .single();
      
      if (!orgError && orgData) {
        setOrganizationSlug(orgData.slug);
        setNewSlug(orgData.slug);
      }

      // Fetch HeyGen credits via edge function
      const { data: creditsData, error: creditsError } = await supabase.functions.invoke('get-heygen-credits');
      
      if (creditsError) {
        console.error('Erro ao buscar créditos:', creditsError);
      } else {
        setHeygenCredits(creditsData);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const sanitizeSlug = (input: string): string => {
    return input
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSlugChange = (value: string) => {
    setNewSlug(sanitizeSlug(value));
  };

  const handleSaveSlug = async () => {
    if (!newSlug.trim() || newSlug === organizationSlug) {
      setEditingSlug(false);
      return;
    }

    setSavingSlug(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ slug: newSlug })
        .eq('slug', organizationSlug);

      if (error) throw error;

      setOrganizationSlug(newSlug);
      setEditingSlug(false);
      toast({ title: 'Link atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Error updating slug:', error);
      toast({
        title: 'Erro ao atualizar link',
        description: error.message?.includes('unique') ? 'Este link já está em uso.' : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingSlug(false);
    }
  };

  const getPublicUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/cliente/${organizationSlug}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getPublicUrl());
      setCopied(true);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'unlock', password },
      });

      if (error) throw error;

      if (data.success) {
        setShowUnlockDialog(false);
        toast({ title: 'Acesso autorizado!' });
        navigate('/configure-credentials');
        return true;
      } else {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        return false;
      }
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast({ title: 'Erro ao verificar senha', variant: 'destructive' });
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const remainingCredits = heygenCredits?.euvatarCredits ?? 960;
  const totalCredits = heygenCredits?.totalEuvatarCredits ?? 960;
  const creditsPercentage = heygenCredits?.percentageRemaining ?? 100;
  const minutesRemaining = heygenCredits?.minutesRemaining ?? 240;
  const hoursRemaining = heygenCredits?.hoursRemaining ?? 4;
  const hasCredentialsConfigured = !heygenCredits?.error;
  const needsCredentialUpdate = heygenCredits?.needsCredentialUpdate;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  return (
    <AppLayout title="Gerenciamento de Euvatares">

        {/* Credits Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Uso de Créditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    {remainingCredits} de {totalCredits} créditos restantes
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(minutesRemaining)} ({minutesRemaining}min) de 4h (240min)
                  </span>
                </div>
                <Progress value={creditsPercentage} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{remainingCredits}</p>
                  <p className="text-xs text-muted-foreground">Créditos Restantes</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatTime(minutesRemaining)}</p>
                  <p className="text-sm text-muted-foreground">({minutesRemaining} min)</p>
                  <p className="text-xs text-muted-foreground">Tempo Restante</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{totalCredits - remainingCredits}</p>
                  <p className="text-xs text-muted-foreground">Créditos Usados</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatTime(240 - minutesRemaining)}</p>
                  <p className="text-sm text-muted-foreground">({240 - minutesRemaining} min)</p>
                  <p className="text-xs text-muted-foreground">Tempo Usado</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                20 créditos = 5 minutos de uso. Plano inicial: 960 créditos (4 horas / 240 minutos).
              </p>
              {needsCredentialUpdate && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ A API key do Euvatar está inválida ou expirada. Atualize na aba Credenciais do euvatar.
                </p>
              )}
              {!hasCredentialsConfigured && !needsCredentialUpdate && (
                <p className="text-xs text-yellow-600">
                  Configure as credenciais do euvatar para ver os créditos em tempo real.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Public Link Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Seu Link Público
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Este é o link que seus clientes usarão para acessar sua experiência Euvatar.
            </p>
            
            {editingSlug ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {window.location.origin}/cliente/
                  </span>
                  <Input
                    value={newSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="seu-link"
                    className="flex-1"
                    disabled={savingSlug}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveSlug} 
                    disabled={savingSlug || !newSlug.trim()}
                    size="sm"
                  >
                    {savingSlug ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingSlug(false);
                      setNewSlug(organizationSlug);
                    }}
                    disabled={savingSlug}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <code className="flex-1 text-sm break-all">{getPublicUrl()}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyToClipboard}
                  title="Copiar link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingSlug(true)}
                  title="Editar link"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Protected: Configure New Avatar */}
        <Card className="mb-8 border-primary/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Configurar Novo Euvatar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure as credenciais para criar um novo euvatar. Esta área é protegida por senha.
            </p>
            <Button onClick={() => setShowUnlockDialog(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Configurar Credenciais
            </Button>
          </CardContent>
        </Card>

        {/* Avatars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {avatars.length > 0 ? (
            avatars.map((avatar) => {
              const usage = heygenCredits?.avatarUsage?.find(u => u.avatarId === avatar.id);
              const totalMinutes = usage?.totalMinutes ?? 0;
              const euvatarCredits = usage?.euvatarCredits ?? 0;
              const sessionCount = usage?.sessionCount ?? 0;
              
              return (
                <Card 
                  key={avatar.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => navigate(`/avatar/${avatar.id}`)}
                >
                  {avatar.cover_image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={avatar.cover_image_url}
                        alt={`Capa do euvatar ${avatar.name}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b">
                      <User className="h-16 w-16 text-primary/40" />
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="truncate" title={avatar.name}>{avatar.name}</CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/avatar/${avatar.id}/settings`);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tempo usado:</span>
                        <span className="font-medium">{formatTime(totalMinutes)} ({totalMinutes}min)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Créditos usados:</span>
                        <span>{euvatarCredits}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sessões:</span>
                        <span>{sessionCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhum euvatar criado ainda.
                </p>
                <Button onClick={() => navigate('/avatars')}>
                  Criar Primeiro Euvatar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <UnlockPasswordDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          onUnlock={handleUnlock}
        />
    </AppLayout>
  );
};

export default Dashboard;
