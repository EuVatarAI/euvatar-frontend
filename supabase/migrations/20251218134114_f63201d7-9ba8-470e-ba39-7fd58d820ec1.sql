-- Create table for detailed session tracking
CREATE TABLE public.avatar_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  platform TEXT DEFAULT 'web',
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  summary TEXT,
  messages_count INTEGER DEFAULT 0,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions for their avatars
CREATE POLICY "Users can view sessions for their avatars"
ON public.avatar_sessions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM avatars
  WHERE avatars.id = avatar_sessions.avatar_id
  AND avatars.user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_avatar_sessions_avatar_id ON public.avatar_sessions(avatar_id);
CREATE INDEX idx_avatar_sessions_started_at ON public.avatar_sessions(started_at DESC);
CREATE INDEX idx_avatar_sessions_session_id ON public.avatar_sessions(session_id);