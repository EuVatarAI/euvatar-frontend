import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Lock, Save } from 'lucide-react';
import { UnlockPasswordDialog } from '@/components/avatar/UnlockPasswordDialog';

const ConfigureCredentials = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const avatarId = searchParams.get('avatarId');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [credentials, setCredentials] = useState({
    accountId: '',
    apiKey: '',
    avatarExternalId: '',
  });

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: { action: 'unlock', password, avatarId },
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
      const { data, error } = await supabase.functions.invoke('manage-credentials', {
        body: {
          action: 'save',
          avatarId,
          accountId: credentials.accountId,
          apiKey: credentials.apiKey,
          avatarExternalId: credentials.avatarExternalId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: 'Credenciais salvas com sucesso!' });
        const finalAvatarId = data.avatarId || avatarId;
        navigate(`/avatar/${finalAvatarId}`);
      } else {
        toast({ title: data.error || 'Erro ao salvar', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast({ title: 'Erro ao salvar credenciais', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/avatars')} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">Configurar Credenciais do Euvatar</h1>
        </div>

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
    </div>
  );
};

export default ConfigureCredentials;
