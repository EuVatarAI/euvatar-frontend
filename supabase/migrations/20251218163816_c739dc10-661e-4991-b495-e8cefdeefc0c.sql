-- Add slug field to avatars for direct avatar links
ALTER TABLE public.avatars 
ADD COLUMN slug text;

-- Create index for faster lookups
CREATE INDEX idx_avatars_slug ON public.avatars(slug);

-- Add unique constraint for slug within user's avatars
CREATE UNIQUE INDEX idx_avatars_user_slug ON public.avatars(user_id, slug);