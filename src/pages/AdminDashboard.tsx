import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { isCredentialsConfigured } from "@/lib/credentials";
import { 
  Plus, LogOut, Users, Search, Filter, 
  CreditCard, ExternalLink, Eye, EyeOff, 
  Loader2, Clock, AlertCircle, CheckCircle2,
  Building2, Zap, Copy
} from "lucide-react";
import euvatarLogo from "@/assets/euvatar-logo-white.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminClient {
  id: string;
  name: string;
  email: string;
  user_id?: string | null;
  client_url: string | null;
  modality: 'evento' | 'plano_trimestral' | null;
  current_plan: 'plano_4h' | 'plano_7h' | 'plano_20h' | null;
  setup_paid: boolean;
  heygen_api_key: string | null;
  heygen_api_key_valid: boolean;
  credits_balance: number;
  credits_used_this_month: number;
  plan_expiration_date: string | null;
  last_payment_status: string;
  last_payment_at: string | null;
  created_at: string;
  avatar_count?: number;
  has_credentials?: boolean;
}

type ClientStatus = 'ativo' | 'pendente_setup' | 'pendente_pagamento' | 'pendente_integracao' | 'sem_creditos' | 'pendente_avatar' | 'expirado' | 'suspenso';

const getClientStatus = (client: AdminClient): ClientStatus => {
  if (!client.setup_paid) return 'pendente_setup';
  if (!client.modality) return 'pendente_pagamento';
  if (client.plan_expiration_date && new Date(client.plan_expiration_date) < new Date()) return 'expirado';
  if (!client.has_credentials) return 'pendente_integracao';
  if ((client.avatar_count || 0) === 0) return 'pendente_avatar';
  if (client.credits_balance <= 0) return 'sem_creditos';
  return 'ativo';
};

const statusConfig: Record<ClientStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: 'Ativo', variant: 'default' },
  pendente_setup: { label: 'Pendente Setup', variant: 'secondary' },
  pendente_pagamento: { label: 'Pendente Pagamento', variant: 'destructive' },
  pendente_integracao: { label: 'Pendente Integração', variant: 'secondary' },
  sem_creditos: { label: 'Sem Créditos', variant: 'destructive' },
  pendente_avatar: { label: 'Pendente Avatar', variant: 'secondary' },
  expirado: { label: 'Expirado', variant: 'destructive' },
  suspenso: { label: 'Suspenso', variant: 'destructive' },
};

const modalityLabels: Record<string, string> = {
  evento: 'Evento',
  plano_trimestral: 'Plano Trimestral',
};

const planLabels: Record<string, string> = {
  plano_4h: '4h/mês',
  plano_7h: '7h/mês',
  plano_20h: '20h/mês',
};

// Convert credits to hours (240 credits = 1 hour)
// 1 crédito HeyGen (5 min) = 20 créditos Euvatar
const creditsToHours = (credits: number): string => {
  const hours = credits / 240;
  return hours.toFixed(1);
};

interface PendingCharge {
  id: string;
  client_id: string;
  client_name: string;
  type: 'setup' | 'event_addition' | 'payment';
  amount_cents: number;
  hours?: number;
  stripe_link: string | null;
  created_at: string;
}

export const AdminDashboard = () => {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAdminAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/admin');
      return;
    }
    if (!profile || profile.role !== 'admin') {
      signOut();
      toast({
        title: "Acesso negado",
        description: "Sua conta não possui permissão administrativa.",
        variant: "destructive",
      });
      navigate('/admin');
      return;
    }
    fetchClients();
    fetchPendingCharges();
  }, [authLoading, navigate, profile, signOut, toast, user]);

  const fetchClients = async () => {
    try {
      // Fetch clients from admin_clients table
      const { data: clientsData, error } = await supabaseAdmin
        .from('admin_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: avatarsData } = await supabaseAdmin
        .from('avatars')
        .select('id, user_id');

      // Fetch avatar counts for each client
      const clientsWithAvatars = await Promise.all(
        (clientsData || []).map(async (client) => {
          const userAvatarIds = (avatarsData || [])
            .filter((row: any) => row.user_id === client.user_id)
            .map((row: any) => row.id);

          const hasCredentials = isCredentialsConfigured(client);

          return {
            ...client,
            avatar_count: userAvatarIds.length,
            has_credentials: hasCredentials,
          } as AdminClient;
        })
      );

      setClients(clientsWithAvatars);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCharges = async () => {
    try {
      // Fetch pending event additions
      const { data: eventAdditions } = await supabaseAdmin
        .from('client_event_additions')
        .select('*, admin_clients!inner(name)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      // Fetch pending payments (setup, etc.)
      const { data: payments } = await supabaseAdmin
        .from('client_payments')
        .select('*, admin_clients!inner(name)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      const charges: PendingCharge[] = [];

      // Map event additions
      (eventAdditions || []).forEach((ea: any) => {
        charges.push({
          id: ea.id,
          client_id: ea.client_id,
          client_name: ea.admin_clients?.name || 'Cliente',
          type: 'event_addition',
          amount_cents: ea.amount_cents,
          hours: ea.hours,
          stripe_link: ea.stripe_link,
          created_at: ea.created_at,
        });
      });

      // Map payments
      (payments || []).forEach((p: any) => {
        charges.push({
          id: p.id,
          client_id: p.client_id,
          client_name: p.admin_clients?.name || 'Cliente',
          type: p.payment_type === 'setup' ? 'setup' : 'payment',
          amount_cents: p.amount_cents,
          stripe_link: p.stripe_link,
          created_at: p.created_at,
        });
      });

      // Sort by date
      charges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPendingCharges(charges);
    } catch (error) {
      console.error('Error fetching pending charges:', error);
    }
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copiado!",
      description: "Link de pagamento copiado para a área de transferência.",
    });
  };

  const generatePassword = (name: string): string => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    return `${cleanName}123`;
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const password = generatePassword(newName);
      
      const { data, error } = await supabaseAdmin.functions.invoke('admin-create-client', {
        body: {
          name: newName,
          email: newEmail,
          password,
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'Erro ao criar cliente');
      }

      toast({
        title: "Cliente criado com sucesso!",
        description: `Senha inicial: ${password}`,
      });

      // Reset form
      setNewName("");
      setNewEmail("");
      setIsCreateDialogOpen(false);
      
      // Refresh clients list
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    signOut();
    navigate('/admin');
  };

  // Filter clients
  const filteredClients = clients.filter((client) => {
    // Search filter
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const clientStatus = getClientStatus(client);
    const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;
    
    // Modality filter
    const matchesModality = modalityFilter === 'all' || client.modality === modalityFilter;
    
    // Payment filter
    const matchesPayment = paymentFilter === 'all' || 
      (paymentFilter === 'pendente' && client.last_payment_status === 'pendente') ||
      (paymentFilter === 'pago' && client.last_payment_status === 'pago');
    
    return matchesSearch && matchesStatus && matchesModality && matchesPayment;
  });

  // Stats
  const activeClients = clients.filter(c => getClientStatus(c) === 'ativo').length;
  const pendingPayments = clients.filter(c => c.last_payment_status === 'pendente').length;
  const totalCredits = clients.reduce((sum, c) => sum + c.credits_balance, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={euvatarLogo} alt="Euvatar" className="h-10" />
            <span className="text-lg font-semibold text-muted-foreground">Admin</span>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-sm text-muted-foreground">Total Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeClients}</p>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingPayments}</p>
                  <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{creditsToHours(totalCredits)}h</p>
                  <p className="text-sm text-muted-foreground">Créditos Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Charges Section */}
        {pendingCharges.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Cobranças Pendentes ({pendingCharges.length})
              </CardTitle>
              <CardDescription>Cobranças aguardando pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingCharges.map((charge) => (
                  <div 
                    key={`${charge.type}-${charge.id}`}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{charge.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {charge.type === 'setup' ? 'Setup' : 
                           charge.type === 'event_addition' ? `+${charge.hours}h Evento` : 
                           'Pagamento'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{formatCurrency(charge.amount_cents)}</span>
                      {charge.stripe_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(charge.stripe_link || '')}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/client/${charge.client_id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver Cliente
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Gerencie todas as contas de clientes</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Cliente</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para criar uma nova conta de cliente.
                      A senha será gerada automaticamente: nomedocliente123
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Cliente *</Label>
                      <Input
                        id="name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nome completo do cliente"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-email">E-mail de Login *</Label>
                      <Input
                        id="client-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="cliente@empresa.com"
                        required
                      />
                    </div>
                    {newName && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Senha gerada:</strong> {generatePassword(newName)}
                        </p>
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        "Criar Cliente"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pendente_setup">Pendente Setup</SelectItem>
                  <SelectItem value="pendente_pagamento">Pendente Pagamento</SelectItem>
                  <SelectItem value="pendente_integracao">Pendente Integração</SelectItem>
                  <SelectItem value="sem_creditos">Sem Créditos</SelectItem>
                  <SelectItem value="pendente_avatar">Pendente Avatar</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Modalidades</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="plano_trimestral">Plano Trimestral</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pagamento Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 
                  ? "Nenhum cliente cadastrado ainda."
                  : "Nenhum cliente encontrado com os filtros aplicados."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Consumo Mês</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const status = getClientStatus(client);
                      const statusInfo = statusConfig[status];
                      
                      return (
                        <TableRow 
                          key={client.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/client/${client.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.modality ? (
                              <div>
                                <p className="text-sm">{modalityLabels[client.modality]}</p>
                                {client.current_plan && (
                                  <p className="text-xs text-muted-foreground">
                                    {planLabels[client.current_plan]}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{client.credits_balance} créditos</p>
                              <p className="text-xs text-muted-foreground">
                                {creditsToHours(client.credits_balance)} horas
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{client.credits_used_this_month} créditos</p>
                              <p className="text-xs text-muted-foreground">
                                {creditsToHours(client.credits_used_this_month)} horas
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.plan_expiration_date ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(client.plan_expiration_date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={client.last_payment_status === 'pago' ? 'default' : 'secondary'}
                            >
                              {client.last_payment_status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  Ações
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/client/${client.id}`); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Gerar Cobrança
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Acessar como Cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
