-- Change credits fields to numeric to support fractional values
ALTER TABLE public.admin_clients
ALTER COLUMN credits_balance TYPE numeric(10,2) USING credits_balance::numeric(10,2),
ALTER COLUMN credits_used_this_month TYPE numeric(10,2) USING credits_used_this_month::numeric(10,2);

-- Update default values
ALTER TABLE public.admin_clients
ALTER COLUMN credits_balance SET DEFAULT 0,
ALTER COLUMN credits_used_this_month SET DEFAULT 0;

-- Change client_consumption_log credits_used to numeric
ALTER TABLE public.client_consumption_log
ALTER COLUMN credits_used TYPE numeric(10,2) USING credits_used::numeric(10,2);

-- Change client_payments credits_to_add to numeric
ALTER TABLE public.client_payments
ALTER COLUMN credits_to_add TYPE numeric(10,2) USING credits_to_add::numeric(10,2);

-- Change client_event_additions credits to numeric
ALTER TABLE public.client_event_additions
ALTER COLUMN credits TYPE numeric(10,2) USING credits::numeric(10,2);

-- Change client_avatars credits_used to numeric
ALTER TABLE public.client_avatars
ALTER COLUMN credits_used TYPE numeric(10,2) USING credits_used::numeric(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.admin_clients.credits_balance IS 'Saldo de créditos - 20 créditos = 5 min (1 crédito = 15 segundos)';
COMMENT ON COLUMN public.client_consumption_log.credits_used IS 'Créditos consumidos - calculado proporcionalmente (segundos / 15)';