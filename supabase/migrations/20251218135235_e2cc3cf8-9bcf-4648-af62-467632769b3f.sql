-- Create avatar_buttons table for configurable buttons
CREATE TABLE public.avatar_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('session_start', 'video_upload', 'external_link')),
  external_url TEXT,
  size TEXT NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  position_x INTEGER NOT NULL DEFAULT 50,
  position_y INTEGER NOT NULL DEFAULT 80,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_buttons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view buttons for their avatars"
ON public.avatar_buttons FOR SELECT
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_buttons.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can create buttons for their avatars"
ON public.avatar_buttons FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_buttons.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can update buttons for their avatars"
ON public.avatar_buttons FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_buttons.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can delete buttons for their avatars"
ON public.avatar_buttons FOR DELETE
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_buttons.avatar_id AND avatars.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_avatar_buttons_updated_at
BEFORE UPDATE ON public.avatar_buttons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();