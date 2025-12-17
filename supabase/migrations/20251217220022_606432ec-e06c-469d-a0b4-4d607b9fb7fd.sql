-- Add cover image URL column to avatars table
ALTER TABLE public.avatars 
ADD COLUMN cover_image_url text;