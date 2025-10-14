-- Create table for avatar credentials (encrypted)
CREATE TABLE IF NOT EXISTS public.avatar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- Encrypted
  api_key TEXT NOT NULL, -- Encrypted
  avatar_external_id TEXT NOT NULL, -- Encrypted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(avatar_id)
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.credential_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB
);

-- Enable RLS
ALTER TABLE public.avatar_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avatar_credentials
-- Users can view credentials for their own avatars (read-only)
CREATE POLICY "Users can view credentials for their avatars"
  ON public.avatar_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.avatars
      WHERE avatars.id = avatar_credentials.avatar_id
      AND avatars.user_id = auth.uid()
    )
  );

-- RLS Policies for audit logs
-- Users can view audit logs for their own avatars
CREATE POLICY "Users can view audit logs for their avatars"
  ON public.credential_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.avatars
      WHERE avatars.id = credential_audit_logs.avatar_id
      AND avatars.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_avatar_credentials_updated_at
  BEFORE UPDATE ON public.avatar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();