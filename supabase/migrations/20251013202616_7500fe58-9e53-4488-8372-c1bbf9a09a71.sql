-- Create contexts table
CREATE TABLE public.contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  enabled BOOLEAN NOT NULL DEFAULT true,
  placement TEXT NOT NULL DEFAULT 'bottom_right',
  size TEXT NOT NULL DEFAULT 'medium',
  keywords_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(avatar_id, name)
);

-- Enable RLS
ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;

-- Users can view contexts for their avatars
CREATE POLICY "Users can view contexts for their avatars"
ON public.contexts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = contexts.avatar_id
    AND avatars.user_id = auth.uid()
  )
);

-- Users can create contexts for their avatars
CREATE POLICY "Users can create contexts for their avatars"
ON public.contexts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = contexts.avatar_id
    AND avatars.user_id = auth.uid()
  )
);

-- Users can update contexts for their avatars
CREATE POLICY "Users can update contexts for their avatars"
ON public.contexts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = contexts.avatar_id
    AND avatars.user_id = auth.uid()
  )
);

-- Users can delete contexts for their avatars
CREATE POLICY "Users can delete contexts for their avatars"
ON public.contexts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.avatars
    WHERE avatars.id = contexts.avatar_id
    AND avatars.user_id = auth.uid()
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_contexts_updated_at
BEFORE UPDATE ON public.contexts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to extract keywords from description
CREATE OR REPLACE FUNCTION public.extract_keywords_from_description()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Simple keyword extraction: lowercase and remove special chars
  NEW.keywords_text := lower(
    regexp_replace(NEW.description, '[^a-záàâãéèêíïóôõöúçñ0-9\s]', '', 'g')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-extract keywords
CREATE TRIGGER extract_keywords_on_insert_or_update
BEFORE INSERT OR UPDATE ON public.contexts
FOR EACH ROW
EXECUTE FUNCTION public.extract_keywords_from_description();