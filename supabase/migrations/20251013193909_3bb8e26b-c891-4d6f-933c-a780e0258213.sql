-- Create avatars table
CREATE TABLE public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  backstory TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4',
  voice_model TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_credits table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 1000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'app')),
  duration INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media_triggers table
CREATE TABLE public.media_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  trigger_phrase TEXT NOT NULL,
  media_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_documents table
CREATE TABLE public.training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avatars
CREATE POLICY "Users can view their own avatars"
  ON public.avatars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own avatars"
  ON public.avatars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars"
  ON public.avatars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars"
  ON public.avatars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for media_triggers
CREATE POLICY "Users can view media triggers for their avatars"
  ON public.media_triggers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = media_triggers.avatar_id
    AND avatars.user_id = auth.uid()
  ));

CREATE POLICY "Users can create media triggers for their avatars"
  ON public.media_triggers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = media_triggers.avatar_id
    AND avatars.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete media triggers for their avatars"
  ON public.media_triggers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = media_triggers.avatar_id
    AND avatars.user_id = auth.uid()
  ));

-- RLS Policies for training_documents
CREATE POLICY "Users can view training documents for their avatars"
  ON public.training_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_documents.avatar_id
    AND avatars.user_id = auth.uid()
  ));

CREATE POLICY "Users can create training documents for their avatars"
  ON public.training_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_documents.avatar_id
    AND avatars.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete training documents for their avatars"
  ON public.training_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = training_documents.avatar_id
    AND avatars.user_id = auth.uid()
  ));

-- Create trigger for updating updated_at column
CREATE TRIGGER update_avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize user credits
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 1000, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to initialize credits for new users
CREATE TRIGGER on_auth_user_created_initialize_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();