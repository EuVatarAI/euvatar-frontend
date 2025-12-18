-- Add font_size column to avatar_buttons
ALTER TABLE public.avatar_buttons 
ADD COLUMN font_size INTEGER NOT NULL DEFAULT 16;