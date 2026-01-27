import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Lock, Save } from 'lucide-react';
import { UnlockPasswordDialog } from '@/components/avatar/UnlockPasswordDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';

const ConfigureCredentials = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const avatarId = searchParams.get('avatarId');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState<Array<{ id: string; name: string | null }>>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(avatarId);
  const [newAvatarName, setNewAvatarName] = useState('');
  const [validationStatus, setValidationStatus] = useState<{
    status: 'valid' | 'invalid' | 'error';
    message: string;
    checked_at?: string;
  } | null>(null);
  
  const [credentials, setCredentials] = useState({
    accountId: '',
    apiKey: '',
    avatarExternalId: '',
  });

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'unlock', password, avatarId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setUnlocked(true);
        setShowUnlockDialog(false);
        toast({ title: 'Desbloqueado com sucesso!' });
        return true;
      } else {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        return false;
      }
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast({ title: 'Erro ao desbloquear', variant: 'destructive' });
      return false;
    }
  };

  const handleSave = async () => {
    let avatarIdToSave = selectedAvatarId || avatarId;
    if (!credentials.accountId || !credentials.apiKey || !credentials.avatarExternalId) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (!avatarIdToSave) {
        if (!user) {
          throw new Error('Usuário não autenticado.');
        }
        const name = newAvatarName.trim() || credentials.avatarExternalId.trim();
        const { data: newAvatar, error: createError } = await supabase
          .from('avatars')
          .insert({
            user_id: user.id,
            name,
            backstory: '',
            language: 'pt-BR',
            ai_model: 'gpt-4',
            voice_model: 'alloy',
          })
          .select('id')
          .single();

        if (createError || !newAvatar) {
          throw createError || new Error('Erro ao criar avatar.');
        }

        avatarIdToSave = newAvatar.id;
        setSelectedAvatarId(newAvatar.id);
        navigate(`/configure-credentials?avatarId=${newAvatar.id}`, { replace: true });
      }

      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: {
          action: 'save',
          avatarId: avatarIdToSave,
          accountId: credentials.accountId,
          apiKey: credentials.apiKey,
          avatarExternalId: credentials.avatarExternalId,
        },
      });

      if (error) throw error;

      const isValid = data?.status === 'valid' || data?.success === true || (data?.avatarId && !data?.error);
      if (isValid) {
        if (data.status && data.message) {
          setValidationStatus({
            status: data.status,
            message: data.message,
            checked_at: data.checked_at,
          });
        }
        toast({ title: 'Credenciais salvas com sucesso!' });
        const finalAvatarId = data.avatarId || avatarIdToSave;
        navigate(`/avatar/${finalAvatarId}?tab=edit`);
      } else {
        if (data.status && data.message) {
          setValidationStatus({
            status: data.status,
            message: data.message,
            checked_at: data.checked_at,
          });
        }
        toast({ title: data.message || data.error || 'Erro ao salvar', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      if (error?.context?.status) {
        setValidationStatus({
          status: 'error',
          message: error.message || 'Erro ao salvar credenciais',
        });
      }
      toast({ title: 'Erro ao salvar credenciais', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!unlocked || !user) return;
    const loadAvatars = async () => {
      const { data, error } = await supabase
        .from('avatars')
        .select('id,name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching avatars:', error);
        toast({ title: 'Erro ao carregar avatares', variant: 'destructive' });
        return;
      }
      setAvatars((data || []) as Array<{ id: string; name: string | null }>);
    };

    loadAvatars();
  }, [unlocked, user, toast]);

  useEffect(() => {
    if (avatarId) {
      setSelectedAvatarId(avatarId);
    }
  }, [avatarId]);

  const handleSelectAvatar = (value: string) => {
    setSelectedAvatarId(value);
    setValidationStatus(null);
    navigate(`/configure-credentials?avatarId=${value}`, { replace: true });
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    valid: { label: 'Válida', className: 'bg-emerald-600 text-white border-transparent' },
    invalid: { label: 'Inválida', className: 'bg-red-600 text-white border-transparent' },
    error: { label: 'Erro', className: 'bg-amber-500 text-white border-transparent' },
  };

  return (
    <AppLayout title="Configurar Credenciais do Euvatar">
      <div className="max-w-2xl">

        <Card>
          <CardHeader>
            <CardTitle>Credenciais Externas</CardTitle>
            <CardDescription>
              Configure as credenciais necessárias para conectar seu euvatar ao sistema externo.
              Esta etapa é obrigatória antes de criar/editar o euvatar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!unlocked ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Esta área é protegida. Clique no botão abaixo para desbloquear.
                </p>
                <Button onClick={() => setShowUnlockDialog(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Desbloquear
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label>Avatar *</Label>
                  <div className="space-y-3">
                    <Select value={selectedAvatarId ?? ''} onValueChange={handleSelectAvatar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um avatar" />
                      </SelectTrigger>
                      <SelectContent>
                        {avatars.map((avatar) => (
                          <SelectItem key={avatar.id} value={avatar.id}>
                            {avatar.name || avatar.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => navigate('/avatars')}
                      variant="outline"
                      className="w-full"
                    >
                      Criar novo avatar
                    </Button>
                    {!selectedAvatarId && avatars.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Sem avatares ainda. Preencha as credenciais e salve para criar um avatar automaticamente.
                      </p>
                    )}
                  </div>
                </div>

                {!selectedAvatarId && (
                  <div>
                    <Label htmlFor="avatarName">Nome do avatar (opcional)</Label>
                    <Input
                      id="avatarName"
                      type="text"
                      value={newAvatarName}
                      onChange={(e) => setNewAvatarName(e.target.value)}
                      placeholder="Ex: Avatar da Flávia"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se vazio, usamos o Euvatar External ID como nome.
                    </p>
                  </div>
                )}

                {validationStatus && (
                  <Card className="border-dashed">
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig[validationStatus.status]?.className}>
                          {statusConfig[validationStatus.status]?.label || 'Status'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {validationStatus.checked_at ? new Date(validationStatus.checked_at).toLocaleString() : 'Agora'}
                        </span>
                      </div>
                      <p className="text-sm">{validationStatus.message}</p>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <Label htmlFor="accountId">Account ID *</Label>
                  <Input
                    id="accountId"
                    type="text"
                    value={credentials.accountId}
                    onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
                    placeholder="Digite o Account ID"
                  />
                </div>

                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                    placeholder="Digite a API Key"
                  />
                </div>

                <div>
                  <Label htmlFor="avatarExternalId">Euvatar External ID *</Label>
                  <Input
                    id="avatarExternalId"
                    type="text"
                    value={credentials.avatarExternalId}
                    onChange={(e) => setCredentials({ ...credentials, avatarExternalId: e.target.value })}
                    placeholder="Digite o Euvatar External ID"
                  />
                </div>


                <div className="flex gap-4 pt-4">
                  <Button 
                    onClick={() => navigate('/avatars')} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar e Continuar'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <UnlockPasswordDialog
          open={showUnlockDialog}
          onOpenChange={setShowUnlockDialog}
          onUnlock={handleUnlock}
        />
      </div>
    </AppLayout>
  );
};

export default ConfigureCredentials;
