-- Create table for avatar ads
CREATE TABLE public.avatar_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 15,
  display_order INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_ads ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view ads for their avatars"
ON public.avatar_ads FOR SELECT
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_ads.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can create ads for their avatars"
ON public.avatar_ads FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_ads.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can update ads for their avatars"
ON public.avatar_ads FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_ads.avatar_id AND avatars.user_id = auth.uid()
));

CREATE POLICY "Users can delete ads for their avatars"
ON public.avatar_ads FOR DELETE
USING (EXISTS (
  SELECT 1 FROM avatars WHERE avatars.id = avatar_ads.avatar_id AND avatars.user_id = auth.uid()
));

-- Create index for ordering
CREATE INDEX idx_avatar_ads_order ON public.avatar_ads(avatar_id, display_order);