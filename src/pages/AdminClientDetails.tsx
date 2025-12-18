import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, Save, Loader2, CreditCard, Key, Users, 
  Clock, CheckCircle2, AlertCircle, Plus, ExternalLink,
  Eye, EyeOff, Trash2, Settings, BarChart3
} from "lucide-react";
import euvatarLogo from "@/assets/euvatar-logo-white.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface AdminClient {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  client_url: string | null;
  modality: 'evento' | 'plano_trimestral' | null;
  current_plan: 'plano_4h' | 'plano_7h' | 'plano_20h' | null;
  setup_paid: boolean;
  setup_paid_at: string | null;
  setup_stripe_link: string | null;
  heygen_api_key: string | null;
  heygen_avatar_id: string | null;
  heygen_interactive_avatar_id: string | null;
  heygen_api_key_valid: boolean;
  credits_balance: number;
  credits_used_this_month: number;
  plan_start_date: string | null;
  plan_expiration_date: string | null;
  last_credit_reload_at: string | null;
  last_payment_status: string;
  last_payment_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientAvatar {
  id: string;
  name: string;
  avatar_url: string | null;
  heygen_avatar_id: string | null;
  credits_used: number;
  created_at: string;
}

interface ClientPayment {
  id: string;
  payment_type: string;
  amount_cents: number;
  description: string | null;
  stripe_link: string | null;
  status: string;
  paid_at: string | null;
  credits_to_add: number;
  created_at: string;
}

interface EventAddition {
  id: string;
  hours: number;
  credits: number;
  amount_cents: number;
  stripe_link: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const SETUP_PRICE = 1550000; // R$ 15.500,00 in cents
const EVENT_HOUR_PRICE = 35000; // R$ 350,00 per hour in cents
const EVENT_BLOCK_HOURS = 4;
const CREDITS_PER_HOUR = 240; // 1 crédito HeyGen (5 min) = 20 créditos Euvatar

const planConfigs = {
  plano_4h: { hours: 4, pricePerHour: 35000, monthly: 140000, quarterly: 420000, credits: 960 },
  plano_7h: { hours: 7, pricePerHour: 30000, monthly: 210000, quarterly: 630000, credits: 1680 },
  plano_20h: { hours: 20, pricePerHour: 25000, monthly: 500000, quarterly: 1500000, credits: 4800 },
};

// 20 créditos = 5 min (300 seg), então 1 crédito = 15 segundos
const creditsToHours = (credits: number): string => {
  const hours = credits / CREDITS_PER_HOUR;
  return hours.toFixed(2);
};

const creditsToMinutes = (credits: number): string => {
  const minutes = (credits * 15) / 60; // 1 crédito = 15 seg
  return minutes.toFixed(1);
};

const secondsToCredits = (seconds: number): number => {
  return Number((seconds / 15).toFixed(2)); // 1 crédito = 15 segundos
};

const formatCredits = (credits: number): string => {
  return credits.toFixed(2);
};

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

export const AdminClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<AdminClient | null>(null);
  const [avatars, setAvatars] = useState<ClientAvatar[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [eventAdditions, setEventAdditions] = useState<EventAddition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Editable fields
  const [clientUrl, setClientUrl] = useState("");
  const [modality, setModality] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [heygenApiKey, setHeygenApiKey] = useState("");
  const [heygenAvatarId, setHeygenAvatarId] = useState("");
  const [heygenInteractiveAvatarId, setHeygenInteractiveAvatarId] = useState("");
  const [planStartDate, setPlanStartDate] = useState("");
  
  // Add avatar dialog
  const [isAddAvatarOpen, setIsAddAvatarOpen] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const checkAdminAccess = () => {
    const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (!isAdminLoggedIn) {
      navigate('/admin');
    }
  };

  const fetchClientData = async () => {
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('admin_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      
      setClient(clientData);
      setClientUrl(clientData.client_url || "");
      setModality(clientData.modality || "");
      setCurrentPlan(clientData.current_plan || "");
      setHeygenApiKey(clientData.heygen_api_key || "");
      setHeygenAvatarId(clientData.heygen_avatar_id || "");
      setHeygenInteractiveAvatarId(clientData.heygen_interactive_avatar_id || "");
      setPlanStartDate(clientData.plan_start_date || "");

      // Fetch avatars
      const { data: avatarsData } = await supabase
        .from('client_avatars')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      setAvatars(avatarsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      setPayments(paymentsData || []);

      // Fetch event additions
      const { data: additionsData } = await supabase
        .from('client_event_additions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      setEventAdditions(additionsData || []);

    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: "Erro ao carregar cliente",
        description: "Cliente não encontrado.",
        variant: "destructive",
      });
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!client) return;
    setSaving(true);

    try {
      // Calculate expiration date if plan start date is set
      let expirationDate = null;
      if (planStartDate && modality === 'plano_trimestral') {
        const start = new Date(planStartDate);
        start.setMonth(start.getMonth() + 3);
        expirationDate = start.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('admin_clients')
        .update({
          client_url: clientUrl || null,
          modality: (modality || null) as 'evento' | 'plano_trimestral' | null,
          current_plan: (currentPlan || null) as 'plano_4h' | 'plano_7h' | 'plano_20h' | null,
          heygen_api_key: heygenApiKey || null,
          heygen_avatar_id: heygenAvatarId || null,
          heygen_interactive_avatar_id: heygenInteractiveAvatarId || null,
          plan_start_date: planStartDate || null,
          plan_expiration_date: expirationDate,
        })
        .eq('id', client.id);

      if (error) throw error;

      // Log URL change if changed
      if (clientUrl !== client.client_url) {
        await supabase.from('client_url_history').insert({
          client_id: client.id,
          old_url: client.client_url,
          new_url: clientUrl || null,
          changed_by: 'admin',
        });
      }

      toast({
        title: "Cliente atualizado!",
        description: "As alterações foram salvas.",
      });

      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSetupPayment = async () => {
    if (!client) return;

    try {
      const { error } = await supabase.from('client_payments').insert({
        client_id: client.id,
        payment_type: 'setup',
        amount_cents: SETUP_PRICE,
        description: 'Setup inicial - inclui 4 horas (960 créditos)',
        credits_to_add: 960,
        status: 'pendente',
      });

      if (error) throw error;

      toast({
        title: "Cobrança gerada!",
        description: "Link Stripe será adicionado quando integração estiver pronta.",
      });

      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGeneratePlanPayment = async () => {
    if (!client || !currentPlan) return;

    const plan = planConfigs[currentPlan as keyof typeof planConfigs];
    if (!plan) return;

    try {
      const { error } = await supabase.from('client_payments').insert({
        client_id: client.id,
        payment_type: 'plano_trimestral',
        amount_cents: plan.quarterly,
        description: `Plano ${plan.hours}h/mês - Trimestral`,
        credits_to_add: plan.credits * 3, // 3 months
        status: 'pendente',
      });

      if (error) throw error;

      toast({
        title: "Cobrança do plano gerada!",
      });

      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddEventCredits = async () => {
    if (!client) return;

    try {
      const { error } = await supabase.from('client_event_additions').insert({
        client_id: client.id,
        hours: EVENT_BLOCK_HOURS,
        credits: EVENT_BLOCK_HOURS * CREDITS_PER_HOUR,
        amount_cents: EVENT_BLOCK_HOURS * EVENT_HOUR_PRICE,
        status: 'pendente',
      });

      if (error) throw error;

      toast({
        title: "Adição de créditos criada!",
        description: `${EVENT_BLOCK_HOURS} horas (${formatCurrency(EVENT_BLOCK_HOURS * EVENT_HOUR_PRICE)})`,
      });

      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      const { error } = await supabase.from('client_avatars').insert({
        client_id: client.id,
        name: newAvatarName,
        avatar_url: newAvatarUrl || null,
      });

      if (error) throw error;

      toast({
        title: "Avatar adicionado!",
      });

      setNewAvatarName("");
      setNewAvatarUrl("");
      setIsAddAvatarOpen(false);
      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (paymentId: string, creditsToAdd: number) => {
    if (!client) return;

    try {
      // Update payment status
      await supabase
        .from('client_payments')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('id', paymentId);

      // Add credits to client
      await supabase
        .from('admin_clients')
        .update({ 
          credits_balance: client.credits_balance + creditsToAdd,
          last_payment_status: 'pago',
          last_payment_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      // Check if it was setup payment
      const payment = payments.find(p => p.id === paymentId);
      if (payment?.payment_type === 'setup') {
        await supabase
          .from('admin_clients')
          .update({ setup_paid: true, setup_paid_at: new Date().toISOString() })
          .eq('id', client.id);
      }

      toast({
        title: "Pagamento confirmado!",
        description: `${creditsToAdd} créditos adicionados.`,
      });

      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={euvatarLogo} alt="Euvatar" className="h-8" />
            <span className="text-lg font-semibold">{client.name}</span>
          </div>
          <Button onClick={handleSaveClient} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Client Info Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{client.credits_balance}</p>
                  <p className="text-sm text-muted-foreground">
                    Créditos ({creditsToHours(client.credits_balance)}h)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{client.credits_used_this_month}</p>
                  <p className="text-sm text-muted-foreground">Consumo do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avatars.length}</p>
                  <p className="text-sm text-muted-foreground">Avatares</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${client.setup_paid ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  {client.setup_paid ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold">{client.setup_paid ? 'Pago' : 'Pendente'}</p>
                  <p className="text-sm text-muted-foreground">Setup</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="avatars">Avatares</TabsTrigger>
            <TabsTrigger value="consumption">Consumo</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={client.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={client.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input value={client.password_hash} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>URL da Conta</Label>
                    <Input
                      value={clientUrl}
                      onChange={(e) => setClientUrl(e.target.value)}
                      placeholder="minha-empresa"
                    />
                    <p className="text-xs text-muted-foreground">
                      Acesso: {window.location.origin}/{clientUrl || 'sua-url'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contratação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select value={modality} onValueChange={setModality}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="evento">Evento</SelectItem>
                        <SelectItem value="plano_trimestral">Plano Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {modality === 'plano_trimestral' && (
                    <>
                      <div className="space-y-2">
                        <Label>Plano</Label>
                        <Select value={currentPlan} onValueChange={setCurrentPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o plano..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plano_4h">4h/mês - R$ 1.400/mês (R$ 4.200 tri)</SelectItem>
                            <SelectItem value="plano_7h">7h/mês - R$ 2.100/mês (R$ 6.300 tri)</SelectItem>
                            <SelectItem value="plano_20h">20h/mês - R$ 5.000/mês (R$ 15.000 tri)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Início</Label>
                        <Input
                          type="date"
                          value={planStartDate}
                          onChange={(e) => setPlanStartDate(e.target.value)}
                        />
                      </div>
                      {planStartDate && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Expira em:</strong>{" "}
                            {(() => {
                              const exp = new Date(planStartDate);
                              exp.setMonth(exp.getMonth() + 3);
                              return exp.toLocaleDateString('pt-BR');
                            })()}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* HeyGen Integration */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Integração HeyGen
                  </CardTitle>
                  <CardDescription>
                    1 crédito HeyGen (5 min) = 20 créditos Euvatar | 240 créditos = 1 hora
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>API Key da Conta</Label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={heygenApiKey}
                          onChange={(e) => setHeygenApiKey(e.target.value)}
                          placeholder="Cole a API Key aqui"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <Badge variant={client.heygen_api_key_valid ? "default" : "secondary"} className="mt-1">
                        {client.heygen_api_key_valid ? "Válida" : "Não validada"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar ID</Label>
                      <Input
                        value={heygenAvatarId}
                        onChange={(e) => setHeygenAvatarId(e.target.value)}
                        placeholder="ID do avatar HeyGen"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interactive Avatar ID</Label>
                      <Input
                        value={heygenInteractiveAvatarId}
                        onChange={(e) => setHeygenInteractiveAvatarId(e.target.value)}
                        placeholder="ID do avatar interativo"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Setup Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Setup Obrigatório</CardTitle>
                  <CardDescription>R$ 15.500,00 - Inclui 4 horas iniciais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Status do Setup</p>
                      <p className="text-sm text-muted-foreground">
                        {client.setup_paid 
                          ? `Pago em ${new Date(client.setup_paid_at!).toLocaleDateString('pt-BR')}`
                          : 'Aguardando pagamento'}
                      </p>
                    </div>
                    <Badge variant={client.setup_paid ? "default" : "secondary"}>
                      {client.setup_paid ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                  {!client.setup_paid && (
                    <Button onClick={handleGenerateSetupPayment} className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerar Cobrança do Setup
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Histórico de Pagamentos</CardTitle>
                  <CardDescription>Todos os pagamentos do cliente</CardDescription>
                </div>
                <div className="flex gap-2">
                  {modality === 'evento' && (
                    <Button variant="outline" onClick={handleAddEventCredits}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Créditos (4h)
                    </Button>
                  )}
                  {modality === 'plano_trimestral' && currentPlan && (
                    <Button variant="outline" onClick={handleGeneratePlanPayment}>
                      <Plus className="h-4 w-4 mr-2" />
                      Gerar Cobrança Trimestral
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pagamento registrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Créditos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.payment_type}</TableCell>
                          <TableCell>{payment.description || '-'}</TableCell>
                          <TableCell>{formatCurrency(payment.amount_cents)}</TableCell>
                          <TableCell>{payment.credits_to_add}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === 'pago' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {payment.status === 'pendente' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMarkAsPaid(payment.id, payment.credits_to_add)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Marcar Pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Event Additions */}
            {modality === 'evento' && (
              <Card>
                <CardHeader>
                  <CardTitle>Adições de Evento</CardTitle>
                  <CardDescription>
                    Blocos de 4 horas adicionais ({eventAdditions.length}/10 utilizados)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {eventAdditions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhuma adição de créditos.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Horas</TableHead>
                          <TableHead>Créditos</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventAdditions.map((addition) => (
                          <TableRow key={addition.id}>
                            <TableCell>{addition.hours}h</TableCell>
                            <TableCell>{addition.credits}</TableCell>
                            <TableCell>{formatCurrency(addition.amount_cents)}</TableCell>
                            <TableCell>
                              <Badge variant={addition.status === 'pago' ? 'default' : 'secondary'}>
                                {addition.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(addition.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Avatars Tab */}
          <TabsContent value="avatars">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Avatares do Cliente</CardTitle>
                  <CardDescription>Gerencie os avatares e suas URLs</CardDescription>
                </div>
                <Dialog open={isAddAvatarOpen} onOpenChange={setIsAddAvatarOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Avatar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Avatar</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAvatar} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Nome do Avatar</Label>
                        <Input
                          value={newAvatarName}
                          onChange={(e) => setNewAvatarName(e.target.value)}
                          placeholder="Nome do avatar"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL Pública</Label>
                        <Input
                          value={newAvatarUrl}
                          onChange={(e) => setNewAvatarUrl(e.target.value)}
                          placeholder="url-do-avatar"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Adicionar
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {avatars.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum avatar cadastrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>HeyGen ID</TableHead>
                        <TableHead>Consumo</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avatars.map((avatar) => (
                        <TableRow key={avatar.id}>
                          <TableCell className="font-medium">{avatar.name}</TableCell>
                          <TableCell>
                            {avatar.avatar_url ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {avatar.avatar_url}
                              </code>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {avatar.heygen_avatar_id || '-'}
                          </TableCell>
                          <TableCell>
                            {avatar.credits_used} créditos
                          </TableCell>
                          <TableCell>
                            {new Date(avatar.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consumption Tab */}
          <TabsContent value="consumption">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Consumo</CardTitle>
                <CardDescription>Sessões e créditos utilizados</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Histórico de consumo será preenchido conforme as sessões forem registradas.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminClientDetails;
