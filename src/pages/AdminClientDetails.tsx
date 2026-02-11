import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { buildManageCredentialsPayload } from "@/lib/credentials";
import { 
  ArrowLeft, Save, Loader2, CreditCard, Key, Users, 
  Clock, CheckCircle2, AlertCircle, Plus, ExternalLink,
  Eye, EyeOff, Trash2, Settings, BarChart3, Copy, Link,
  Pause, Play, XCircle, Edit
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
import { type AvatarHeyGenUsage } from "@/services/credits";

interface AdminClient {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  user_id?: string | null;
  client_url: string | null;
  modality: 'evento' | 'plano_trimestral' | null;
  current_plan: 'plano_4h' | 'plano_7h' | 'plano_20h' | null;
  status: string;
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
  credits_used: number;
  created_at: string;
  updated_at?: string;
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
  const [clientLocked, setClientLocked] = useState(true);
  const [clientSaveStatus, setClientSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [clientSaveMessage, setClientSaveMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [clientUserId, setClientUserId] = useState<string>("");
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [consumptionError, setConsumptionError] = useState<string>("");
  const [avatarUsageMap, setAvatarUsageMap] = useState<Record<string, AvatarHeyGenUsage>>({});
  const [consumptionTotals, setConsumptionTotals] = useState({
    sessionCount: 0,
    totalSeconds: 0,
    totalMinutes: 0,
    euvatarCredits: 0,
  });
  
  // Editable fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [modality, setModality] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [planStartDate, setPlanStartDate] = useState("");

  // Credentials (admin)
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [credLocked, setCredLocked] = useState(true);
  const [credSaving, setCredSaving] = useState(false);
  const [credStatus, setCredStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle');
  const [credMessage, setCredMessage] = useState("");
  const [credentials, setCredentials] = useState({
    accountId: "",
    apiKey: "",
    avatarExternalId: "",
  });
  
  // Add avatar dialog
  const [isAddAvatarOpen, setIsAddAvatarOpen] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newAvatarExternalId, setNewAvatarExternalId] = useState("");
  
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
    if (clientId) {
      fetchClientData();
    }
  }, [authLoading, clientId, navigate, profile, signOut, toast, user]);

  useEffect(() => {
    if (!selectedAvatarId) return;
    fetchCredentials(selectedAvatarId);
  }, [selectedAvatarId]);

  const fetchClientData = async () => {
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from('admin_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      
      setClient(clientData);
      setClientName(clientData.name || "");
      setClientEmail(clientData.email || "");
      setClientPassword(clientData.password_hash || "");
      setClientUrl(clientData.client_url || "");
      setModality(clientData.modality || "");
      setCurrentPlan(clientData.current_plan || "");
      setPlanStartDate(clientData.plan_start_date || "");
      setClientLocked(true);
      setClientSaveStatus('idle');
      setClientSaveMessage("");

      // Resolve client user_id (auth user) to use avatars table
      let resolvedUserId = clientData.user_id || "";
      if (!resolvedUserId && clientData.email) {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', clientData.email)
          .maybeSingle();
        resolvedUserId = profileData?.user_id || "";
      }
      setClientUserId(resolvedUserId);

      // Fetch avatars (source of truth)
      if (resolvedUserId) {
        const { data: avatarsData } = await supabaseAdmin
          .from('avatars')
          .select('id, name, cover_image_url, created_at, updated_at')
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: false });

        const mapped = (avatarsData || []).map(a => ({
          id: a.id,
          name: a.name,
          avatar_url: a.cover_image_url,
          credits_used: 0,
          created_at: a.created_at,
          updated_at: a.updated_at || undefined,
        }));
        setAvatars(mapped);
        if (!selectedAvatarId && mapped.length > 0) {
          setSelectedAvatarId(mapped[0].id);
        }

        await fetchConsumptionData(mapped.map(a => a.id));
      } else {
        setAvatars([]);
        setAvatarUsageMap({});
        setConsumptionTotals({
          sessionCount: 0,
          totalSeconds: 0,
          totalMinutes: 0,
          euvatarCredits: 0,
        });
      }

      // Fetch payments
      const { data: paymentsData } = await supabaseAdmin
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      setPayments(paymentsData || []);

      // Fetch event additions
      const { data: additionsData } = await supabaseAdmin
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

  const fetchConsumptionData = async (avatarIds: string[]) => {
    if (!avatarIds.length) {
      setAvatarUsageMap({});
      setConsumptionTotals({
        sessionCount: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        euvatarCredits: 0,
      });
      return;
    }

    setConsumptionLoading(true);
    setConsumptionError("");
    try {
      const { data: sessionsData, error } = await supabaseAdmin
        .from('avatar_sessions')
        .select('avatar_id, duration_seconds')
        .in('avatar_id', avatarIds);

      if (error) throw error;

      const usageMap: Record<string, AvatarHeyGenUsage> = {};
      let totalSeconds = 0;
      let totalSessions = 0;

      (sessionsData || []).forEach((session) => {
        const avatarId = session.avatar_id;
        const seconds = Number(session.duration_seconds || 0);
        totalSeconds += seconds;
        totalSessions += 1;
        if (!usageMap[avatarId]) {
          usageMap[avatarId] = {
            avatarId,
            heygenAvatarId: '',
            totalSeconds: 0,
            totalMinutes: 0,
            heygenCredits: 0,
            euvatarCredits: 0,
            sessionCount: 0,
          };
        }
        usageMap[avatarId].totalSeconds += seconds;
        usageMap[avatarId].sessionCount += 1;
      });

      Object.values(usageMap).forEach((usage) => {
        const minutes = usage.totalSeconds / 60;
        usage.totalMinutes = Number(minutes.toFixed(2));
        usage.euvatarCredits = secondsToCredits(usage.totalSeconds);
        usage.heygenCredits = Number((usage.euvatarCredits / 20).toFixed(2)); // 20 créditos euvatar = 1 HeyGen
      });

      const totalMinutes = Number((totalSeconds / 60).toFixed(2));
      const totalCredits = secondsToCredits(totalSeconds);

      setAvatarUsageMap(usageMap);
      setConsumptionTotals({
        sessionCount: totalSessions,
        totalSeconds,
        totalMinutes,
        euvatarCredits: totalCredits,
      });
    } catch (error: any) {
      console.error('Erro ao carregar consumo:', error);
      setConsumptionError(error.message || "Erro ao carregar consumo.");
      setAvatarUsageMap({});
      setConsumptionTotals({
        sessionCount: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        euvatarCredits: 0,
      });
    } finally {
      setConsumptionLoading(false);
    }
  };

  const fetchCredentials = async (avatarId: string) => {
    if (!avatarId) return;
    try {
      const { data, error } = await supabaseAdmin.functions.invoke('manage-credentials', {
        body: buildManageCredentialsPayload({
          action: 'fetch',
          avatarId,
          clientId,
          userId: client?.user_id ?? null,
        }),
      });
      if (error) throw error;
      if (data?.credentials) {
        setCredentials({
          accountId: data.credentials.accountId || "",
          apiKey: data.credentials.apiKey || "",
          avatarExternalId: data.credentials.avatarExternalId || "",
        });
      } else {
        setCredentials({ accountId: "", apiKey: "", avatarExternalId: "" });
      }
      setCredLocked(true);
      setCredStatus('idle');
      setCredMessage("");
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      toast({
        title: "Erro ao carregar credenciais",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSaveCredentials = async () => {
    let avatarId = selectedAvatarId;
    if (!avatarId) {
      if (!clientUserId) {
        setCredStatus('error');
        setCredMessage("Usuário do cliente não encontrado.");
        toast({
          title: "Sem usuário",
          description: "Não foi possível localizar o usuário do cliente para criar o avatar.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data, error } = await supabaseAdmin.functions.invoke('admin-create-avatar', {
          body: {
            user_id: clientUserId,
            name: clientName?.trim() ? `Avatar ${clientName}` : "Avatar do Cliente",
            cover_image_url: null,
          },
        });

        if (error) throw error;
        const avatarData = data?.avatar;
        avatarId = avatarData?.id || crypto.randomUUID();

        setAvatars(prev => [{
          id: avatarId,
          name: avatarData?.name || (clientName?.trim() ? `Avatar ${clientName}` : "Avatar do Cliente"),
          avatar_url: avatarData?.cover_image_url || null,
          credits_used: 0,
          created_at: avatarData?.created_at || new Date().toISOString(),
          updated_at: avatarData?.updated_at || undefined,
        }, ...prev]);

        setSelectedAvatarId(avatarId);
      } catch (error: any) {
        setCredStatus('error');
        setCredMessage(error.message || "Erro ao criar avatar.");
        toast({
          title: "Erro ao criar avatar",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }
    setCredSaving(true);
    setCredStatus('idle');
    setCredMessage("");

    try {
      const { data, error } = await supabaseAdmin.functions.invoke('manage-credentials', {
        body: buildManageCredentialsPayload({
          action: 'save',
          avatarId,
          clientId,
          userId: client?.user_id ?? null,
          credentials: {
            accountId: credentials.accountId,
            apiKey: credentials.apiKey,
            avatarExternalId: credentials.avatarExternalId,
          },
        }),
      });
      if (error) throw error;
      if (data?.status !== 'valid') {
        setCredStatus('invalid');
        setCredMessage(data?.message || "Credenciais inválidas.");
        throw new Error(data?.message || "Credenciais inválidas.");
      }

      setCredLocked(true);
      setCredStatus('valid');
      setCredMessage("Credenciais salvas com sucesso.");
      toast({
        title: "Credenciais salvas",
        description: "As credenciais foram persistidas no sistema.",
      });
    } catch (error: any) {
      setCredStatus('error');
      setCredMessage(error.message || "Erro ao salvar credenciais.");
      toast({
        title: "Erro ao salvar credenciais",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCredSaving(false);
    }
  };

  const handleSaveClient = async () => {
    if (!client) return;
    setSaving(true);
    setClientSaveStatus('idle');
    setClientSaveMessage('');

    try {
      // Calculate expiration date if plan start date is set
      let expirationDate = null;
      if (planStartDate && modality === 'plano_trimestral') {
        const start = new Date(planStartDate);
        start.setMonth(start.getMonth() + 3);
        expirationDate = start.toISOString().split('T')[0];
      }

      const { data, error } = await supabaseAdmin.functions.invoke('admin-update-client', {
        body: {
          client_id: client.id,
          name: clientName || null,
          email: clientEmail || null,
          password: clientPassword || null,
          client_url: clientUrl || null,
          modality: (modality || null) as 'evento' | 'plano_trimestral' | null,
          current_plan: (currentPlan || null) as 'plano_4h' | 'plano_7h' | 'plano_20h' | null,
          plan_start_date: planStartDate || null,
          plan_expiration_date: expirationDate,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erro ao salvar');

      toast({
        title: "Cliente atualizado!",
        description: "As alterações foram salvas.",
      });

      setClientLocked(true);
      setClientSaveStatus('saved');
      setClientSaveMessage('Dados salvos com sucesso.');
      fetchClientData();
    } catch (error: any) {
      setClientSaveStatus('error');
      setClientSaveMessage(error.message || 'Erro ao salvar.');
      toast({
        title: "Erro ao salvar",
        description: error.message || 'Erro ao salvar',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSetupPayment = async () => {
    if (!client) return;

    try {
      // Gerar link de pagamento placeholder (para integração futura com Stripe)
      const stripeLink = `https://pay.stripe.com/placeholder?amount=${SETUP_PRICE}&client=${client.id}&type=setup`;

      const { error } = await supabaseAdmin.from('client_payments').insert({
        client_id: client.id,
        payment_type: 'setup',
        amount_cents: SETUP_PRICE,
        description: 'Setup inicial - inclui 4 horas (960 créditos)',
        credits_to_add: 960,
        status: 'pendente',
        stripe_link: stripeLink,
      });

      if (error) throw error;

      // Auto-preencher data de contratação se não estiver definida
      if (!planStartDate) {
        const today = new Date().toISOString().split('T')[0];
        setPlanStartDate(today);
        await supabaseAdmin
          .from('admin_clients')
          .update({ plan_start_date: today })
          .eq('id', client.id);
      }

      toast({
        title: "Cobrança gerada!",
        description: "Link de pagamento criado com sucesso.",
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

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('client_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Cobrança cancelada!",
        description: "A cobrança foi removida com sucesso.",
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

  const pendingSetupPayment = payments.find(p => p.payment_type === 'setup' && p.status === 'pendente');

  const handleGeneratePlanPayment = async () => {
    if (!client || !currentPlan) return;

    const plan = planConfigs[currentPlan as keyof typeof planConfigs];
    if (!plan) return;

    try {
      const { error } = await supabaseAdmin.from('client_payments').insert({
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

    const amount = 140000; // R$ 1.400,00 em centavos

    try {
      // Primeiro, salvar a modalidade se ainda não estiver salva
      if (client.modality !== 'evento') {
        await supabaseAdmin
          .from('admin_clients')
          .update({ modality: 'evento' })
          .eq('id', client.id);
      }

      // Gerar link de pagamento placeholder (para integração futura com Stripe)
      const stripeLink = `https://pay.stripe.com/placeholder?amount=${amount}&client=${client.id}`;

      const { error } = await supabaseAdmin.from('client_event_additions').insert({
        client_id: client.id,
        hours: EVENT_BLOCK_HOURS,
        credits: EVENT_BLOCK_HOURS * CREDITS_PER_HOUR,
        amount_cents: amount,
        status: 'pendente',
        stripe_link: stripeLink,
      });

      if (error) throw error;

      toast({
        title: "Cobrança de +4 horas criada!",
        description: `Valor: R$ 1.400,00. Link de pagamento gerado.`,
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
    if (!clientUserId) {
      toast({
        title: "Usuário não encontrado",
        description: "Não foi possível localizar o usuário do cliente para criar o avatar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Se ainda não há credenciais carregadas, tenta usar as do 1º avatar existente
      let accountId = credentials.accountId.trim();
      let apiKey = credentials.apiKey.trim();
      if ((!accountId || !apiKey) && avatars.length > 0) {
        const fallbackAvatarId = avatars[0]?.id;
        if (fallbackAvatarId) {
          const { data: credData } = await supabaseAdmin.functions.invoke('manage-credentials', {
            body: buildManageCredentialsPayload({
              action: 'fetch',
              avatarId: fallbackAvatarId,
              clientId,
              userId: client?.user_id ?? null,
            }),
          });
          if (credData?.credentials) {
            accountId = credData.credentials.accountId?.toString()?.trim() || "";
            apiKey = credData.credentials.apiKey?.toString()?.trim() || "";
            setCredentials({
              accountId,
              apiKey,
              avatarExternalId: credentials.avatarExternalId,
            });
          }
        }
      }

      if (!accountId || !apiKey) {
        toast({
          title: "Credenciais obrigatórias",
          description: "Configure a API da conta HeyGen antes de adicionar novos avatares.",
          variant: "destructive",
        });
        return;
      }
      if (!newAvatarExternalId.trim()) {
        toast({
          title: "Avatar External ID obrigatório",
          description: "Informe o ID externo do avatar para vincular a credencial.",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabaseAdmin.functions.invoke('admin-create-avatar', {
        body: {
          user_id: clientUserId,
          client_id: client.id,
          email: client.email,
          name: newAvatarName,
          cover_image_url: newAvatarUrl || null,
        },
      });

      if (error) throw error;
      const avatarData = data?.avatar;
      const createdAvatarId = avatarData?.id || crypto.randomUUID();

      const { error: credError } = await supabaseAdmin.functions.invoke('manage-credentials', {
        body: buildManageCredentialsPayload({
          action: 'save',
          avatarId: createdAvatarId,
          clientId,
          userId: client?.user_id ?? null,
          credentials: {
            accountId,
            apiKey,
            avatarExternalId: newAvatarExternalId.trim(),
          },
        }),
      });

      if (credError) throw credError;

      setAvatars(prev => [{
        id: createdAvatarId,
        name: avatarData?.name || newAvatarName,
        avatar_url: avatarData?.cover_image_url || newAvatarUrl || null,
        credits_used: 0,
        created_at: avatarData?.created_at || new Date().toISOString(),
        updated_at: avatarData?.updated_at || undefined,
      }, ...prev]);

      toast({
        title: "Avatar adicionado!",
      });

      setNewAvatarName("");
      setNewAvatarUrl("");
      setNewAvatarExternalId("");
      setSelectedAvatarId(createdAvatarId);
      setCredentials({
        accountId: credentials.accountId.trim(),
        apiKey: credentials.apiKey.trim(),
        avatarExternalId: newAvatarExternalId.trim(),
      });
      setCredStatus('valid');
      setCredMessage("Credenciais salvas com sucesso.");
      setIsAddAvatarOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar avatar.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return;

    try {
      const { error } = await supabaseAdmin
        .from('admin_clients')
        .update({ status: newStatus })
        .eq('id', client.id);

      if (error) throw error;

      setClient(prev => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: newStatus === 'pausado' ? "Conta pausada!" : 
               newStatus === 'cancelado' ? "Conta cancelada!" : "Conta ativada!",
        description: newStatus === 'pausado' 
          ? "A integração HeyGen foi pausada." 
          : newStatus === 'cancelado' 
          ? "A conta foi cancelada."
          : "A conta está ativa novamente.",
      });
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
      await supabaseAdmin
        .from('client_payments')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('id', paymentId);

      // Add credits to client
      await supabaseAdmin
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
        await supabaseAdmin
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

  const handleDeleteEventAddition = async (additionId: string) => {
    if (!client) return;

    try {
      // TODO: Quando Stripe estiver integrado, cancelar o payment link aqui
      // await stripe.paymentLinks.update(paymentLinkId, { active: false });

      const { error } = await supabaseAdmin
        .from('client_event_additions')
        .delete()
        .eq('id', additionId);

      if (error) throw error;

      // Atualiza estado local sem recarregar a página
      setEventAdditions(prev => prev.filter(e => e.id !== additionId));

      toast({
        title: "Cobrança excluída!",
        description: "A cobrança foi removida com sucesso.",
      });
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
            <Badge 
              variant={client.status === 'ativo' ? 'default' : client.status === 'pausado' ? 'secondary' : 'destructive'}
            >
              {client.status === 'ativo' ? 'Ativo' : client.status === 'pausado' ? 'Pausado' : 'Cancelado'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {client.status === 'ativo' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('pausado')}>
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            )}
            {client.status === 'pausado' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('ativo')}>
                <Play className="h-4 w-4 mr-1" />
                Ativar
              </Button>
            )}
            {client.status !== 'cancelado' && (
              <Button variant="destructive" size="sm" onClick={() => handleStatusChange('cancelado')}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
            {client.status === 'cancelado' && (
              <Button variant="default" size="sm" onClick={() => handleStatusChange('ativo')}>
                <Play className="h-4 w-4 mr-1" />
                Reativar
              </Button>
            )}
            <Button onClick={handleSaveClient} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
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

        <Dialog open={isAddAvatarOpen} onOpenChange={setIsAddAvatarOpen}>
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
              <Separator />
              <div className="space-y-2">
                <Label>Avatar External ID</Label>
                <Input
                  value={newAvatarExternalId}
                  onChange={(e) => setNewAvatarExternalId(e.target.value)}
                  placeholder="ID externo do avatar"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Adicionar
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="h-12 p-1">
            <TabsTrigger value="info" className="text-base px-6 py-2">Informações</TabsTrigger>
            <TabsTrigger value="payments" className="text-base px-6 py-2">Pagamentos</TabsTrigger>
            <TabsTrigger value="avatars" className="text-base px-6 py-2">Avatares</TabsTrigger>
            <TabsTrigger value="consumption" className="text-base px-6 py-2">Consumo</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            {/* Ações Rápidas */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Ações Rápidas</h3>
                    <p className="text-sm text-muted-foreground">Gerencie o status da conta e avatares</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {client.status === 'ativo' && (
                      <Button variant="outline" onClick={() => handleStatusChange('pausado')}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar Conta
                      </Button>
                    )}
                    {client.status === 'pausado' && (
                      <Button variant="default" onClick={() => handleStatusChange('ativo')}>
                        <Play className="h-4 w-4 mr-2" />
                        Ativar Conta
                      </Button>
                    )}
                    {client.status === 'cancelado' && (
                      <Button variant="default" onClick={() => handleStatusChange('ativo')}>
                        <Play className="h-4 w-4 mr-2" />
                        Reativar Conta
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setIsAddAvatarOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Avatar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={clientName}
                      disabled={clientLocked}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      value={clientEmail}
                      disabled={clientLocked}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      value={clientPassword}
                      disabled={clientLocked}
                      onChange={(e) => setClientPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL da Conta</Label>
                    <Input
                      value={clientUrl}
                      disabled={clientLocked}
                      onChange={(e) => setClientUrl(e.target.value)}
                      placeholder="minha-empresa"
                    />
                    <p className="text-xs text-muted-foreground">
                      Acesso: {window.location.origin}/{clientUrl || 'sua-url'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      className="w-full md:w-auto"
                      onClick={() => {
                        if (clientLocked) {
                          setClientLocked(false);
                          setClientSaveStatus('idle');
                          setClientSaveMessage('');
                        } else {
                          handleSaveClient();
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : clientLocked ? (
                        <Edit className="h-4 w-4 mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {clientLocked ? "Editar Dados" : "Salvar Dados"}
                    </Button>
                    {clientSaveStatus !== 'idle' && (
                      <Badge variant={clientSaveStatus === 'saved' ? "default" : "destructive"}>
                        {clientSaveMessage || (clientSaveStatus === 'saved' ? "Salvo" : "Erro")}
                      </Badge>
                    )}
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

                  {modality === 'evento' && (
                    <>
                      <Separator className="my-4" />
                      {(() => {
                        const paidAdditions = eventAdditions.filter(e => e.status === 'pago');
                        const setupPaidBlock = client.setup_paid ? 1 : 0;
                        const totalPaidBlocks = setupPaidBlock + paidAdditions.length;
                        const totalBlocks = setupPaidBlock + eventAdditions.length;
                        
                        return (
                          <>
                            <div className="p-4 bg-muted rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Blocos pagos</span>
                                <Badge variant="outline">{totalPaidBlocks}/10</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Blocos contratados (pendentes)</span>
                                <span className="text-sm text-muted-foreground">
                                  {totalBlocks - totalPaidBlocks} pendente{totalBlocks - totalPaidBlocks !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Horas pagas</span>
                                <span className="text-sm">{totalPaidBlocks * 4}h (máx 40h)</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Créditos disponíveis</span>
                                <span className="text-sm font-bold">{formatCredits(client.credits_balance)}</span>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={handleAddEventCredits}
                              disabled={eventAdditions.length >= 9}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar +4 horas - R$ 1.400,00 ({eventAdditions.length}/9 adições)
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Setup pago libera 4h iniciais. Máximo 9 adições extras (36h).
                            </p>
                            
                            {/* Lista de cobranças de evento */}
                            {eventAdditions.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <Label className="text-sm font-medium">Cobranças de Horas Adicionais</Label>
                                <div className="space-y-2">
                                  {eventAdditions.map((addition) => (
                                    <div 
                                      key={addition.id} 
                                      className="flex items-center justify-between p-3 bg-card border rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">+{addition.hours}h</span>
                                          <span className="text-xs text-muted-foreground">
                                            {formatCurrency(addition.amount_cents)}
                                          </span>
                                        </div>
                                        <Badge variant={addition.status === 'pago' ? 'default' : 'secondary'}>
                                          {addition.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {addition.stripe_link && addition.status !== 'pago' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              navigator.clipboard.writeText(addition.stripe_link || '');
                                              toast({
                                                title: "Link copiado!",
                                                description: "Link de pagamento copiado para a área de transferência.",
                                              });
                                            }}
                                          >
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copiar Link
                                          </Button>
                                        )}
                                        {addition.status !== 'pago' && (
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteEventAddition(addition.id)}
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Excluir
                                          </Button>
                                        )}
                                        {addition.status === 'pago' && addition.paid_at && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(addition.paid_at).toLocaleDateString('pt-BR')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}

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

              {/* API da conta HeyGen */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API da conta HeyGen
                  </CardTitle>
                  <CardDescription>
                    API da conta HeyGen é única por cliente (admin_clients). Account ID e Avatar External ID continuam por avatar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Account ID</Label>
                      <Input
                        value={credentials.accountId}
                        disabled={credLocked}
                        onChange={(e) => setCredentials({ ...credentials, accountId: e.target.value })}
                        placeholder="default_account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API da conta HeyGen</Label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={credentials.apiKey}
                          disabled={credLocked}
                          onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                          placeholder="Cole a API da conta HeyGen aqui"
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
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar External ID</Label>
                      <Input
                        value={credentials.avatarExternalId}
                        disabled={credLocked}
                        onChange={(e) => setCredentials({ ...credentials, avatarExternalId: e.target.value })}
                        placeholder="ID externo do avatar"
                      />
                    </div>
                  </div>

                  {!selectedAvatarId && (
                    <div className="text-sm text-muted-foreground">
                      Cadastre um avatar para salvar credenciais.
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button
                      className="w-full md:w-auto"
                      onClick={() => {
                        if (credLocked) {
                          setCredLocked(false);
                          setCredStatus('idle');
                          setCredMessage("");
                        } else {
                          handleSaveCredentials();
                        }
                      }}
                      disabled={credSaving}
                    >
                      {credSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : credLocked ? (
                        <Edit className="h-4 w-4 mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {credLocked ? "Editar" : "Salvar credenciais"}
                    </Button>

                    {credStatus !== 'idle' && (
                      <Badge variant={credStatus === 'valid' ? "default" : "destructive"}>
                        {credMessage || (credStatus === 'valid' ? "Salvo" : "Erro")}
                      </Badge>
                    )}
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
                  {!client.setup_paid && !pendingSetupPayment && (
                    <Button onClick={handleGenerateSetupPayment} className="w-full">
                      <Link className="h-4 w-4 mr-2" />
                      Gerar Link de Pagamento
                    </Button>
                  )}
                  {!client.setup_paid && pendingSetupPayment && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Setup Inicial</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(pendingSetupPayment.amount_cents)} • {new Date(pendingSetupPayment.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <Badge variant="secondary">Pendente</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {pendingSetupPayment.stripe_link && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(pendingSetupPayment.stripe_link || '');
                                toast({
                                  title: "Link copiado!",
                                  description: "Link de pagamento copiado para a área de transferência.",
                                });
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar Link
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelPayment(pendingSetupPayment.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
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
                    <Button 
                      variant="outline" 
                      onClick={handleAddEventCredits}
                      disabled={eventAdditions.length >= 9}
                      title={eventAdditions.length >= 9 ? "Limite de 10 blocos atingido (1 setup + 9 adições)" : ""}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Créditos (4h) ({eventAdditions.length}/9)
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
                        <TableHead>Link</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
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
                            {payment.stripe_link ? (
                              <a 
                                href={payment.stripe_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Acessar
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {payment.status === 'pendente' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleMarkAsPaid(payment.id, payment.credits_to_add)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Pago
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleCancelPayment(payment.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
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
                    Blocos de 4 horas: 1 no Setup + {eventAdditions.length} adições = {1 + eventAdditions.length}/10 total (máx. 40h)
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
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventAdditions.map((addition) => (
                          <TableRow key={addition.id}>
                            <TableCell>{addition.hours}h</TableCell>
                            <TableCell>{formatCredits(addition.credits)}</TableCell>
                            <TableCell>{formatCurrency(addition.amount_cents)}</TableCell>
                            <TableCell>
                              <Badge variant={addition.status === 'pago' ? 'default' : 'secondary'}>
                                {addition.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(addition.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {addition.status === 'pendente' && (
                                <div className="flex gap-2">
                                  {addition.stripe_link && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        navigator.clipboard.writeText(addition.stripe_link || '');
                                        toast({
                                          title: "Link copiado!",
                                        });
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copiar
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeleteEventAddition(addition.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Excluir
                                  </Button>
                                </div>
                              )}
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
                <Button onClick={() => setIsAddAvatarOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Avatar
                </Button>
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
          <TabsContent value="consumption" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{consumptionTotals.sessionCount}</p>
                      <p className="text-sm text-muted-foreground">Sessões registradas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{consumptionTotals.totalMinutes}</p>
                      <p className="text-sm text-muted-foreground">Minutos totais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CreditCard className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCredits(consumptionTotals.euvatarCredits)}</p>
                      <p className="text-sm text-muted-foreground">Créditos Euvatar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Consumo por Avatar</CardTitle>
                <CardDescription>Tempo, sessões e créditos utilizados</CardDescription>
              </CardHeader>
              <CardContent>
                {consumptionLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : consumptionError ? (
                  <p className="text-center text-destructive py-8">{consumptionError}</p>
                ) : avatars.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum avatar cadastrado para este cliente.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Avatar</TableHead>
                        <TableHead>Sessões</TableHead>
                        <TableHead>Minutos</TableHead>
                        <TableHead>Créditos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avatars.map((avatar) => {
                        const usage = avatarUsageMap[avatar.id];
                        const sessionCount = usage?.sessionCount ?? 0;
                        const minutes = usage?.totalMinutes ?? 0;
                        const credits = usage?.euvatarCredits ?? 0;
                        return (
                          <TableRow key={avatar.id}>
                            <TableCell className="font-medium">{avatar.name}</TableCell>
                            <TableCell>{sessionCount}</TableCell>
                            <TableCell>{minutes}</TableCell>
                            <TableCell>{formatCredits(credits)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminClientDetails;
