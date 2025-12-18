-- Add orientation column to avatars table
ALTER TABLE public.avatars 
ADD COLUMN IF NOT EXISTS avatar_orientation text DEFAULT 'vertical';

-- Add comment for clarity
COMMENT ON COLUMN public.avatars.avatar_orientation IS 'Orientation of the HeyGen avatar: vertical or horizontal';