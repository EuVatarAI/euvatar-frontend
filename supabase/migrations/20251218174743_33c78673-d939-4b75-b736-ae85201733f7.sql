-- Enum para modalidade de contratação
CREATE TYPE public.client_modality AS ENUM ('evento', 'plano_trimestral');

-- Enum para status do cliente
CREATE TYPE public.client_status AS ENUM ('ativo', 'pendente_setup', 'pendente_pagamento', 'pendente_integracao', 'sem_creditos', 'pendente_avatar', 'expirado', 'suspenso');

-- Enum para planos trimestrais
CREATE TYPE public.plan_type AS ENUM ('plano_4h', 'plano_7h', 'plano_20h');

-- Tabela principal de clientes
CREATE TABLE public.admin_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  client_url TEXT UNIQUE,
  modality client_modality,
  current_plan plan_type,
  
  -- Setup
  setup_paid BOOLEAN DEFAULT false,
  setup_paid_at TIMESTAMP WITH TIME ZONE,
  setup_stripe_link TEXT,
  
  -- HeyGen integration
  heygen_api_key TEXT,
  heygen_api_key_valid BOOLEAN DEFAULT false,
  
  -- Credits
  credits_balance INTEGER DEFAULT 0,
  credits_used_this_month INTEGER DEFAULT 0,
  
  -- Dates
  plan_start_date DATE,
  plan_expiration_date DATE,
  last_credit_reload_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment tracking
  last_payment_status TEXT DEFAULT 'pendente',
  last_payment_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de pagamentos do cliente
CREATE TABLE public.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.admin_clients(id) ON DELETE CASCADE NOT NULL,
  payment_type TEXT NOT NULL, -- 'setup', 'plano_trimestral', 'adicao_evento', 'troca_plano'
  amount_cents INTEGER NOT NULL,
  description TEXT,
  stripe_link TEXT,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'cancelado'
  paid_at TIMESTAMP WITH TIME ZONE,
  credits_to_add INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de avatares do cliente (diferente dos avatares internos da Euvatar)
CREATE TABLE public.client_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.admin_clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT UNIQUE,
  heygen_avatar_id TEXT,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de consumo
CREATE TABLE public.client_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.admin_clients(id) ON DELETE CASCADE NOT NULL,
  avatar_id UUID REFERENCES public.client_avatars(id) ON DELETE SET NULL,
  credits_used INTEGER NOT NULL,
  session_duration_seconds INTEGER,
  heygen_credits_used NUMERIC(10,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de adições de evento
CREATE TABLE public.client_event_additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.admin_clients(id) ON DELETE CASCADE NOT NULL,
  hours INTEGER DEFAULT 4,
  credits INTEGER DEFAULT 960,
  amount_cents INTEGER NOT NULL,
  stripe_link TEXT,
  status TEXT DEFAULT 'pendente',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de alterações de URL
CREATE TABLE public.client_url_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.admin_clients(id) ON DELETE CASCADE NOT NULL,
  old_url TEXT,
  new_url TEXT,
  changed_by TEXT, -- 'admin' ou 'client'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_consumption_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_event_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_url_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem acessar (usando sessionStorage no frontend por enquanto)
-- Como o admin usa login hardcoded, vamos permitir acesso anônimo para leitura/escrita
-- Em produção, isso deveria usar um sistema de roles adequado

CREATE POLICY "Admin can manage clients" ON public.admin_clients FOR ALL USING (true);
CREATE POLICY "Admin can manage payments" ON public.client_payments FOR ALL USING (true);
CREATE POLICY "Admin can manage client avatars" ON public.client_avatars FOR ALL USING (true);
CREATE POLICY "Admin can manage consumption" ON public.client_consumption_log FOR ALL USING (true);
CREATE POLICY "Admin can manage event additions" ON public.client_event_additions FOR ALL USING (true);
CREATE POLICY "Admin can manage url history" ON public.client_url_history FOR ALL USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_admin_clients_updated_at
  BEFORE UPDATE ON public.admin_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_avatars_updated_at
  BEFORE UPDATE ON public.client_avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();