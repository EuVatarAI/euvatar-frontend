import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, Save, Shield } from 'lucide-react';
import { UnlockPasswordDialog } from './UnlockPasswordDialog';

interface CredentialsTabProps {
  avatarId: string;
}

interface Credentials {
  accountId: string;
  apiKey: string;
  avatarExternalId: string;
}

export function CredentialsTab({ avatarId }: CredentialsTabProps) {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credentials>({
    accountId: '',
    apiKey: '',
    avatarExternalId: '',
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<number | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [avatarId]);

  useEffect(() => {
    if (unlockExpiresAt) {
      const checkExpiration = setInterval(() => {
        if (Date.now() >= unlockExpiresAt) {
          handleLock();
        }
      }, 1000);

      return () => clearInterval(checkExpiration);
    }
  }, [unlockExpiresAt]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'fetch', avatarId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.credentials) {
        setCredentials(response.data.credentials);
      }
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar credenciais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'unlock', password, avatarId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        toast({
          title: 'Erro',
          description: response.error.message || 'Senha inválida',
          variant: 'destructive',
        });
        return false;
      }

      if (response.data?.success) {
        setIsUnlocked(true);
        setUnlockToken(response.data.unlockToken);
        setUnlockExpiresAt(response.data.expiresAt);
        setShowUnlockDialog(false);
        
        toast({
          title: 'Desbloqueado',
          description: 'Campos desbloqueados para edição por 10 minutos.',
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Error unlocking:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao desbloquear campos.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setUnlockToken(null);
    setUnlockExpiresAt(null);
    fetchCredentials(); // Reload to reset any unsaved changes
    
    toast({
      title: 'Bloqueado',
      description: 'Campos bloqueados novamente.',
    });
  };

  const handleSave = async () => {
    if (!unlockToken) {
      toast({
        title: 'Erro',
        description: 'Sessão expirada. Por favor, desbloqueie novamente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-credentials', {
        body: {
          action: 'save',
          avatarId,
          credentials: {
            accountId: credentials.accountId,
            apiKey: credentials.apiKey,
            avatarExternalId: credentials.avatarExternalId,
            unlockToken,
          },
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: response.data?.message || 'Credenciais salvas com sucesso!',
      });

      handleLock();
      await fetchCredentials();
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar credenciais.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getRemainingTime = () => {
    if (!unlockExpiresAt) return '';
    const seconds = Math.max(0, Math.floor((unlockExpiresAt - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando credenciais...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-warning" />
                <CardTitle>Credenciais do Euvatar</CardTitle>
              </div>
              <CardDescription>
                Informações sensíveis do provedor externo. Editável apenas com senha interna da Euvatar.
              </CardDescription>
            </div>
            {isUnlocked ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Tempo restante: {getRemainingTime()}
                </span>
                <Button onClick={handleLock} variant="outline" size="sm">
                  <Lock className="h-4 w-4 mr-2" />
                  Bloquear
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowUnlockDialog(true)} variant="outline" size="sm">
                <Unlock className="h-4 w-4 mr-2" />
                Editar com senha
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="account-id">ID da conta</Label>
              <Input
                id="account-id"
                value={credentials.accountId}
                onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
                placeholder="acct_123456789"
                disabled={!isUnlocked}
                className={!isUnlocked ? 'bg-muted cursor-not-allowed' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Identifica a conta no provedor externo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">Chave de API</Label>
              <Input
                id="api-key"
                type={isUnlocked ? 'text' : 'password'}
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                placeholder="api_live_xxxxxx"
                disabled={!isUnlocked}
                className={!isUnlocked ? 'bg-muted cursor-not-allowed' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Autentica no provedor externo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-external-id">ID do euvatar</Label>
              <Input
                id="avatar-external-id"
                value={credentials.avatarExternalId}
                onChange={(e) => setCredentials({ ...credentials, avatarExternalId: e.target.value })}
                placeholder="avtr_abcdef123456"
                disabled={!isUnlocked}
                className={!isUnlocked ? 'bg-muted cursor-not-allowed' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Identifica qual euvatar será usado pela empresa
              </p>
            </div>
          </div>

          {isUnlocked && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={handleLock} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar credenciais'}
              </Button>
            </div>
          )}

          {!isUnlocked && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Campos bloqueados. Clique em "Editar com senha" para desbloquear temporariamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <UnlockPasswordDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        onUnlock={handleUnlock}
      />
    </>
  );
}
