-- Add additional HeyGen API fields to admin_clients
ALTER TABLE public.admin_clients
ADD COLUMN heygen_avatar_id text,
ADD COLUMN heygen_interactive_avatar_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_clients.heygen_api_key IS 'API Key da conta HeyGen';
COMMENT ON COLUMN public.admin_clients.heygen_avatar_id IS 'ID do avatar HeyGen';
COMMENT ON COLUMN public.admin_clients.heygen_interactive_avatar_id IS 'ID do avatar interativo HeyGen';