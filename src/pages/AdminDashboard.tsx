import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, LogOut, Users, Building2, Eye, EyeOff, Loader2, Copy } from "lucide-react";
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

interface Client {
  id: string;
  email: string;
  full_name: string | null;
  organization_name: string;
  organization_slug: string;
  created_at: string;
}

export const AdminDashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchClients();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/admin');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  const fetchClients = async () => {
    try {
      // Fetch profiles with organization data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          organization_id,
          organizations (
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientList: Client[] = (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        organization_name: p.organizations?.name || 'N/A',
        organization_slug: p.organizations?.slug || 'N/A',
        created_at: p.created_at,
      }));

      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newName,
            company_name: newOrgName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      // If we have a custom slug, update the organization
      if (authData.user && newSlug) {
        // Wait a bit for the trigger to create the organization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update organization slug
        const { data: profileData } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', authData.user.id)
          .single();

        if (profileData?.organization_id) {
          await supabase
            .from('organizations')
            .update({ slug: newSlug.toLowerCase().replace(/\s+/g, '-') })
            .eq('id', profileData.organization_id);
        }
      }

      toast({
        title: "Cliente criado com sucesso!",
        description: `Uma conta foi criada para ${newEmail}`,
      });

      // Reset form
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewOrgName("");
      setNewSlug("");
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-sm text-muted-foreground">Organizações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Gerencie as contas dos clientes</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para criar uma nova conta de cliente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org">Nome da Organização</Label>
                    <Input
                      id="org"
                      value={newOrgName}
                      onChange={(e) => {
                        setNewOrgName(e.target.value);
                        setNewSlug(generateSlug(e.target.value));
                      }}
                      placeholder="Nome da empresa"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (subdomínio)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="slug"
                        value={newSlug}
                        onChange={(e) => setNewSlug(generateSlug(e.target.value))}
                        placeholder="minha-empresa"
                        required
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.euvatar.ai</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">E-mail</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="cliente@empresa.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="client-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
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
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente cadastrado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.full_name || '-'}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.organization_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {client.organization_slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/euvatar/${client.organization_slug}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
