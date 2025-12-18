-- Adicionar coluna de status à tabela admin_clients
ALTER TABLE public.admin_clients 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.admin_clients.status IS 'Status da conta: ativo, pausado, cancelado';